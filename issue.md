Security Audit Summary
Before deploying, these issues must be addressed. They are ordered by severity.
🔴 Critical — Fix Before Any User Touches the System
1. No MIME type allowlist on file uploads
The upload route accepts data.mimetype directly from the multipart request without validating it against an allowlist. A user can upload a .exe, .sh, or .php file — the server stores it and runs it through the AI pipeline. ClamAV catches malware but not all file types should be accepted in the first place.
Add this check immediately after reading the buffer in apps/api/src/routes.ts (around line 1604):
typescriptconst ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword',      // .doc
  'text/plain',
  'text/html',
  'image/jpeg',
  'image/png',
  'image/tiff',
  'image/gif',
]);

const buffer = await data.toBuffer();

if (!ALLOWED_MIME_TYPES.has(data.mimetype)) {
  return reply.status(415).send({
    success: false,
    error: { code: 'UNSUPPORTED_FILE_TYPE', message: `File type ${data.mimetype} is not supported. Upload PDF, DOCX, DOC, or TXT files.` },
  });
}
2. legacy-tenant code path in auth.ts
createRefreshToken() has an overload that accepts a bare string (advocate ID) and generates a token with tenantId: 'legacy-tenant' and role: 'advocate'. If any code path passes a string instead of a full payload, a token is issued that bypasses real tenant isolation. Search your codebase for any call like createRefreshToken(advocateId) and replace with the full payload form. Then remove the string overload entirely — it's a liability.
3. File upload body limit is 1MB for the raw buffer parser, but MAX_FILE_SIZE_BYTES for multipart
The app.addContentTypeParser('*', { parseAs: 'buffer', bodyLimit: 1048576 }) in index.ts sets a 1MB cap on raw requests. But the multipart plugin uses config.MAX_FILE_SIZE_BYTES. Verify these match in your .env.production. A typical contract PDF is 2–10MB — set both to the same value, e.g. 25MB:
dotenvMAX_FILE_SIZE_BYTES=26214400
And in index.ts update the raw parser limit to match:
typescript{ parseAs: 'buffer', bodyLimit: config.MAX_FILE_SIZE_BYTES }
🟡 Medium — Fix Within First Week
4. Billing API fetch has no error boundary in the UI
billing.status() now correctly sends the auth header. But if the API returns an error (network failure, 500, quota exceeded), the useQuery will return undefined and currentPlan silently falls back to Starter. An Enterprise firm would see Starter limits on their dashboard. Add an error state that shows a "Could not load plan" message rather than silently defaulting.
5. TRAEFIK_DASHBOARD_AUTH has a placeholder value in .env.example
The example shows admin:$2y$05$REPLACE_ME. If someone deploys without replacing this, the Traefik dashboard is effectively unprotected (the hash is fake and bcrypt will never match). Generate a real hash during setup:
bashhtpasswd -nbB admin 'STRONG_PASSWORD_HERE'
6. CI workflow uses plaintext test_password for the test database
test_password appears in .github/workflows/ci.yml for the test Postgres instance. This is fine for CI — test databases don't hold real data. But ensure this password is never reused anywhere in .env.production.
🟢 Low — Good to Know

Ollama port 11434 is not exposed publicly — correct, it's only on the internal Docker network. Good.
PostgreSQL and Redis have no public ports — correct, both are internal only. Good.
Traefik dashboard has IP allowlist + basic auth — correct setup.
Cookies are httpOnly, secure, sameSite=strict — correct.
File keys are sanitized with a Unicode-aware regex before storage — correct.
Razorpay webhook verifies HMAC signature — correct.
SCIM uses Bearer token auth — correct.
AI service requires internal key header — correct.
bcrypt cost factor 12 — appropriate.
AES-256-GCM for field encryption — correct algorithm.
No secrets exposed via NEXT_PUBLIC vars — correct.
No SSRF risk found — no user-controlled URLs are fetched.
No SQL injection found — all queries use parameterised $N placeholders.

