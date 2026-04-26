## Issue Index

| # | Severity | Area | Title | Status |
|---|---|---|---|---|
| 1 | 🔴 HIGH | SSO | OIDC client_secret stored and used as plaintext | ✅ Fixed |
| 2 | 🔴 HIGH | DPDP | Internal erasure endpoint unauthenticated when AI_SERVICE_INTERNAL_KEY is unset | ✅ Fixed |
| 3 | 🟠 MEDIUM | SCIM | Group PATCH allows arbitrary role string injection | ✅ Fixed |
| 4 | 🟠 MEDIUM | Upload | Object storage receives client-supplied MIME type instead of server-validated MIME | ✅ Fixed |
| 5 | 🟡 LOW | Auth | Admin can silently disable another user's MFA without step-up auth | ✅ Fixed |
| 6 | 🟡 LOW | WebSocket | Dev-mode unauthenticated fallback reachable if key file is missing | ✅ Fixed |
| 7 | 🟡 LOW | Config | AI_SERVICE_INTERNAL_KEY not enforced as required in production | ✅ Fixed |
| 8 | 🟡 LOW | K8s | NetworkPolicy namespaceSelector: {} too broad for Postgres/Redis egress | ✅ Fixed |
| 9 | ℹ️ INFO | DPDP | DPDP erasure queues to a raw Redis list, not BullMQ — no retry/DLQ | ✅ Fixed |
| 10 | ℹ️ INFO | Upload | Text/HTML MIME accepted on client claim when file-type cannot detect | ✅ Fixed |
| 11 | ℹ️ INFO | SSO | OAuth2 initiateOAuth2Login does not read clientId/Secret from DB | ✅ Fixed |

---

## Confirmed Fixed From Prior Audits

| Prior Issue | Status |
|---|---|
| MFA TOTP never verified on login | ✅ Fixed — OTPAuth.TOTP.validate() called with window:1 |
| SAML signature not verified (regex-parsed XML) | ✅ Fixed — @node-saml/node-saml validatePostResponseAsync() used |
| K8s liveness/readiness probe paths wrong | ✅ Fixed — /health/live and /health/ready match index.ts routes |
| SSE CORS header hardcoded | ✅ Fixed — resolveCorsOrigin() helper now used |
| Password reset does not revoke prior tokens | ✅ Fixed — prior active tokens invalidated before new insert |
| SCIM user creation bypasses advocate limit | ✅ Fixed — enforceAdvocateLimit() called before INSERT |
| Celery NetworkPolicy Redis egress too broad | ✅ Fixed — scoped to podSelector app:redis on port 6379 |
| WebAuthn silent in-memory fallback | ✅ Fixed — throws error if Redis unavailable; falls back only in test |
| attorney_id vs advocate_id drift in refresh_tokens | ✅ Fixed |
| DB_SSL not enforced in production | ✅ Fixed — process.exit(1) if DB_SSL !== 'true' in production |

---

## Detailed Findings

---

### Finding 1 — 🔴 HIGH: OIDC Client Secret Stored and Transmitted as Plaintext

**File:** `apps/api/src/sso.ts`  
**Lines:** 63 (read), 355 (write)

**Description:**  
The `sso_configurations` table has a column named `client_secret_encrypted`, which implies the value is encrypted at rest. It is not. Both the read and write paths have explicit TODO comments acknowledging this:

```typescript
// Read path (line 63):
clientSecret: row.client_secret_encrypted, // Decrypt in production

// Write path (line 355):
config.clientSecret, // Encrypt in production
```

The raw client secret is written directly to the database and read back as plaintext. This means any SQL-level data exposure (backup leak, replica read, direct DB query by an operator) also exposes every tenant's IdP client secret.

**Impact:**  
An attacker who reads the database (via SQLi, stolen backup, compromised replica, or insider access) can use these secrets to:
- Impersonate the application to any connected IdP (Google Workspace, Azure AD, Okta)
- Initiate OAuth2 flows on behalf of the tenant
- Potentially enumerate tenant user accounts from the IdP

**Remediation:**  
Use `APP_ENCRYPTION_KEY` (already present in `config.ts` as a 32-byte AES key) to encrypt the secret before writing and decrypt after reading. The encryption primitives are already imported in `security.ts` (`encryptField` / `decryptField`). This is a one-line change at both call sites:

```typescript
// Write:
encryptField(config.clientSecret, config.APP_ENCRYPTION_KEY)

// Read:
decryptField(row.client_secret_encrypted, config.APP_ENCRYPTION_KEY)
```

---

### Finding 2 — 🔴 HIGH: DPDP Internal Erasure Endpoint Open When AI_SERVICE_INTERNAL_KEY is Unset

**File:** `apps/api/src/dpdp.ts`  
**Lines:** 40–45

**Description:**  
The internal DPDP erasure endpoint `POST /internal/dpdp/erasure` is authenticated by checking the `x-internal-key` header against `config.AI_SERVICE_INTERNAL_KEY`. However, the auth guard has a dangerous fallback:

```typescript
function isInternalRequestAuthorized(request: FastifyRequest): boolean {
  if (!config.AI_SERVICE_INTERNAL_KEY) {
    return true;   // <-- anyone can call this endpoint
  }
  return request.headers['x-internal-key'] === config.AI_SERVICE_INTERNAL_KEY;
}
```

If `AI_SERVICE_INTERNAL_KEY` is not set in the environment (it is `optional()` in `config.ts`), every request to this endpoint is automatically authorized. This endpoint:
- Permanently erases a user's PII (email replaced with placeholder, name set to "Erased User", password nulled, MFA wiped)
- Accepts `tenantId` and `advocateId` from the request body
- Has no additional authorization check

**Impact:**  
Any unauthenticated caller who can reach the API pod can permanently and irreversibly erase any user's personal data across any tenant. This is both a destructive attack vector and a DPDP compliance risk (unauthorized data manipulation).

**Remediation:**  
Two changes needed:

1. Make `AI_SERVICE_INTERNAL_KEY` required in production in `config.ts`:
```typescript
AI_SERVICE_INTERNAL_KEY: isProductionEnv 
  ? z.string().min(32) 
  : z.string().optional(),
```

2. Change the fallback in `isInternalRequestAuthorized` to **deny** when key is unset:
```typescript
function isInternalRequestAuthorized(request: FastifyRequest): boolean {
  if (!config.AI_SERVICE_INTERNAL_KEY) {
    return false;  // fail closed, not open
  }
  return request.headers['x-internal-key'] === config.AI_SERVICE_INTERNAL_KEY;
}
```

---

### Finding 3 — 🟠 MEDIUM: SCIM Group PATCH Allows Arbitrary Role String Injection

**File:** `apps/api/src/scim.ts`  
**Lines:** 718–755

**Description:**  
The SCIM Groups PATCH handler uses the URL path parameter `:id` directly as the role value in a SQL UPDATE without validating it against the application's allowed role set:

```typescript
const { id: role } = request.params as { id: string };
// ...
await pool.query(
  'UPDATE attorneys SET role = $3, updated_at = now() WHERE tenant_id = $1 AND id = $2',
  [tenantId, member.value, role],  // role is raw URL param
);
```

An IdP administrator (or attacker who can craft SCIM requests) can set a user's role to any arbitrary string — for example `superadmin`, `system`, `god`, `__proto__`, or any value that might be privileged in future code or matched in application logic. There is no allowlist check before the UPDATE.

The application defines five valid roles: `admin`, `partner`, `advocate`, `paralegal`, `client`.

**Impact:**  
- Role confusion: users could end up with undefined roles that bypass `role === 'admin'` checks in some conditions but behave unpredictably in others
- Forward-looking risk: any future feature gated on a role name could be inadvertently unlocked
- IdP misconfiguration (a common real-world occurrence) silently corrupts application role data

**Remediation:**  
Add an allowlist check before processing the operation:

```typescript
const VALID_ROLES = new Set(['admin', 'partner', 'advocate', 'paralegal', 'client']);

const { id: role } = request.params as { id: string };
if (!VALID_ROLES.has(role)) {
  return reply.code(404).send({
    schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
    detail: `Group '${role}' not found`,
    status: '404',
  });
}
```

---

### Finding 4 — 🟠 MEDIUM: Object Storage Receives Client-Supplied MIME Type Instead of Validated MIME

**File:** `apps/api/src/routes.ts`  
**Line:** 2276

**Description:**  
The upload handler correctly uses `fileTypeFromBuffer()` to detect the actual MIME type from file bytes and validates it against `ALLOWED_MIME_TYPES`. However, when uploading to object storage, it passes the *client-supplied* `data.mimetype` as the `contentType` metadata instead of the server-detected `mimeType`:

```typescript
// Server correctly detects and validates:
const detected = await fileTypeFromBuffer(buffer);
let mimeType = detected?.mime;
// ...validation against ALLOWED_MIME_TYPES using mimeType...

// But then stores with client's value:
await storage.uploadFile(fileKey, buffer, { contentType: data.mimetype });
//                                                      ^^^^^^^^^^^^^^
//                                                      Should be: mimeType
```

**Impact:**  
- The object stored in S3/local storage has attacker-controlled `Content-Type` metadata
- When the file is later served (e.g., for download), the storage layer or CDN may use this metadata as the `Content-Type` response header
- A PDF containing HTML/JavaScript with `Content-Type: text/html` in metadata could trigger browser execution if served without a `Content-Disposition: attachment` override
- This is a stored content-type spoofing issue that could contribute to a client-side attack

**Remediation:**  
One character change — pass `mimeType` instead of `data.mimetype`:

```typescript
await storage.uploadFile(fileKey, buffer, { contentType: mimeType });
```

---

### Finding 5 — 🟡 LOW: Admin Can Disable Another User's MFA Without Step-Up Authentication

**File:** `apps/api/src/routes.ts`  
**Lines:** 2978–2982 (admin team member update handler)

**Description:**  
The self-service `POST /auth/mfa/disable` route correctly requires password confirmation before disabling MFA. However, the admin team member update route (`PATCH /api/admin/members/:id`) allows an admin to set `mfaEnabled: false` for any team member with only a valid session JWT — no password re-confirmation, no step-up, no audit challenge:

```typescript
if (body.mfaEnabled !== undefined) {
  updates.push(`mfa_enabled = $${paramIndex++}`);
  params.push(body.mfaEnabled);
  if (!body.mfaEnabled) {
    updates.push('mfa_secret = NULL');
    updates.push('mfa_recovery_codes = NULL');
  }
}
```

An attacker who compromises an admin JWT (e.g., via XSS, session hijacking, or a long-lived token from a shared device) can silently remove MFA from any user in the tenant, degrading account security for the entire firm.

**Remediation:**  
Options in order of preference:
1. Require the acting admin to supply their current password when setting `mfaEnabled: false` on another user
2. At minimum, emit a high-visibility audit event and send an email notification to the affected user
3. Require the admin to hold a very recently issued JWT (e.g., issued within the last 5 minutes) for this specific action

The audit event already exists but there is no notification to the affected user.

---

### Finding 6 — 🟡 LOW: WebSocket Dev-Mode Auth Bypass if Key File is Missing

**File:** `apps/api/src/websocket.ts`  
**Lines:** 100–115, 143–147

**Description:**  
The WebSocket authentication middleware checks if the JWT public key file exists. If the file is missing AND `NODE_ENV !== 'production'`, it sets `devModeNoAuth = true` and allows all connections with a hardcoded mock user (role: `admin`, tenantId: `dev-tenant`):

```typescript
if (devModeNoAuth) {
  console.warn('WebSocket: Dev mode - allowing unauthenticated connection');
  (socket as AuthenticatedSocket).user = {
    advocateId: 'dev-user',
    tenantId: 'dev-tenant',
    email: 'dev@localhost',
    role: 'admin',
  };
  return next();
}
```

The production guard (`throw new Error(...)` if key file missing in production) is correct. The risk is operational: a staging environment misconfigured as `NODE_ENV=development` (a common mistake) with a missing key file would silently allow unauthenticated WebSocket connections with admin-level access. Since WebSockets are used for real-time notifications, this could leak matter updates and client data.

**Remediation:**  
Tighten the condition to require an explicit opt-in flag, not just a missing file:

```typescript
} else if (process.env.NODE_ENV === 'development' && process.env.ALLOW_UNAUTHED_WS === 'true') {
  devModeNoAuth = true;
} else {
  throw new Error(`JWT public key not found at ${jwtPublicKeyPath}`);
}
```

---

### Finding 7 — 🟡 LOW: AI_SERVICE_INTERNAL_KEY Not Required in Production

**File:** `apps/api/src/config.ts`  
**Line:** 68

**Description:**  
`AI_SERVICE_INTERNAL_KEY` is defined as `z.string().optional()` with no production enforcement:

```typescript
AI_SERVICE_INTERNAL_KEY: z.string().optional(),
```

This key guards:
- `POST /internal/dpdp/erasure` (see Finding 2 — falls open when unset)
- AI service-to-API internal calls in the orchestrator

If not set in production, any internal-network caller can trigger data erasure, and the AI service has no mutual authentication with the API.

**Remediation:**  
```typescript
AI_SERVICE_INTERNAL_KEY: isProductionEnv 
  ? z.string().min(32) 
  : z.string().optional(),
```

---

### Finding 8 — 🟡 LOW: K8s NetworkPolicy namespaceSelector: {} Too Broad

**File:** `k8s/deployment.yaml`  
**Affected policies:** api-network-policy, worker-network-policy, celery-worker-network-policy

**Description:**  
Several NetworkPolicy egress rules combine `namespaceSelector: {}` (all namespaces) with a pod label selector for Postgres and Redis:

```yaml
egress:
  - to:
    - namespaceSelector: {}          # matches ALL namespaces
      podSelector:
        matchLabels:
          app: postgres
    ports:
      - port: 5432
```

While the pod label does narrow this, `namespaceSelector: {}` still means: "allow egress to any pod labelled `app: postgres` in any namespace in the cluster." In a shared cluster or one that co-hosts other workloads, a malicious or compromised pod in another namespace labelled `app: postgres` or `app: redis` could accept API traffic.

**Remediation:**  
Scope namespace selectors explicitly:

```yaml
- namespaceSelector:
    matchLabels:
      kubernetes.io/metadata.name: evidentis
  podSelector:
    matchLabels:
      app: postgres
```

---

### Finding 9 — ℹ️ INFO: DPDP Erasure Uses Raw Redis List, No Retry or DLQ

**File:** `apps/api/src/dpdp.ts`  
**Lines:** 71–83

**Description:**  
Erasure jobs are queued as a raw `LPUSH` to the `erasure_jobs` Redis list:

```typescript
await redis.lpush('erasure_jobs', JSON.stringify({ type: 'dpdp_erasure', ... }));
```

This is not a BullMQ or Celery queue. There is no:
- Retry on worker failure
- Dead-letter queue for failed erasures
- Visibility timeout (jobs can be lost if a worker crashes mid-processing)
- Job status tracking

Under DPDP, erasure requests must be completed within 30 days of withdrawal. A silent queue failure could result in a compliance breach.

**Remediation:**  
Move DPDP erasure to a BullMQ queue (already used elsewhere in the codebase) with at least 3 retries and a DLQ. Add a scheduled reconciliation job that checks `dpdp_requests` records stuck in `open` or `processing` status for more than 24 hours.

---

### Finding 10 — ℹ️ INFO: Text/HTML MIME Accepted on Client Claim

**File:** `apps/api/src/routes.ts`  
**Lines:** 2173–2177

**Description:**  
The `file-type` library cannot detect plain text reliably (it works on magic bytes, and text has none). The code compensates by trusting the client's `Content-Type` header for `text/plain` and `text/html`:

```typescript
if (!mimeType && (data.mimetype === 'text/plain' || data.mimetype === 'text/html')) {
  mimeType = data.mimetype;
}
```

This means a client can upload any undetectable file and claim it is `text/plain`, bypassing the binary MIME check. More critically, `text/html` is accepted as a valid upload MIME type. HTML files could contain `<script>` tags and, if served back, trigger XSS. `text/html` should not be an accepted upload type for a legal document management system.

**Remediation:**  
Remove `text/html` from the accepted client-claim path. For plain text, accept the client claim only if the buffer passes a UTF-8 validation check:

```typescript
if (!mimeType && data.mimetype === 'text/plain') {
  // Validate it actually looks like valid UTF-8 text
  try { Buffer.from(buffer).toString('utf8'); mimeType = 'text/plain'; }
  catch { /* reject */ }
}
// Remove text/html from this fallback entirely
```

---

### Finding 11 — ℹ️ INFO: OAuth2 initiateOAuth2Login Does Not Use DB-Configured Credentials

**File:** `apps/api/src/sso.ts`  
**Function:** `initiateOAuth2Login`

**Description:**  
`initiateOAuth2Login` accepts `clientId` as a parameter passed by the caller rather than reading it from `sso_configurations` for the tenant. There is no corresponding `getOAuth2Config(tenantId)` function. This means OAuth2 (Google/Microsoft) logins do not go through the same tenant-scoped configuration management as OIDC logins, making it unclear where per-tenant OAuth2 credentials are stored and how they are audited.

**Remediation:**  
Implement a `getOAuth2Config(tenantId)` function parallel to `getOIDCConfig(tenantId)` and use it inside `initiateOAuth2Login`, removing the `clientId` parameter from the public function signature.

---

## Infrastructure Review Summary

| Component | Finding |
|---|---|
| ExternalSecrets (AWS SM) | ✅ Correct — all secrets sourced externally |
| API probe paths | ✅ Fixed — /health/live and /health/ready |
| Pod security contexts | ✅ runAsNonRoot, runAsUser: 1000/1001 on all pods |
| Worker liveness (heartbeat file) | ✅ Correct exec probe pattern |
| Celery liveness (ping) | ✅ Correct celery inspect ping |
| Celery Beat (single replica) | ✅ Correct, replicas: 1 prevents double-firing |
| PodDisruptionBudgets | ✅ api (min 2), worker (min 1), celery-worker (min 1) |
| HPA | ✅ CPU 70% + memory 80% on API tier |
| NetworkPolicy Redis/Postgres egress | ✅ Fixed — scoped to kubernetes.io/metadata.name: evidentis |
| AI service NetworkPolicy | ✅ Fixed — ai-service-network-policy added (ingress from api/worker/celery, egress to ollama) |
| Web deployment NetworkPolicy | ✅ Fixed — web-network-policy added (ingress from ingress-nginx, egress to api) |
| Image tags | ✅ Fixed — all images pinned to v1.2.4 |

---

## Authentication & Token Flow Review

| Area | Status | Notes |
|---|---|---|
| JWT algorithm | ✅ RS256 asymmetric | Keys loaded from filesystem, ephemeral fallback dev-only |
| Refresh token rotation | ✅ Family-based replay detection | Entire family revoked on reuse |
| Token storage | ✅ Only hashes stored in DB | Raw tokens never persisted |
| TOTP MFA on login | ✅ Fixed | OTPAuth.TOTP.validate() with window:1 |
| Account lockout | ✅ 5 attempts, 15-min lockout | Configurable via env |
| Password policy | ✅ Enforced | Min 12 chars, upper/lower/number/special |
| PKCE + nonce on OIDC | ✅ Correct | S256 challenge, nonce stored in Redis |
| SAML signature verification | ✅ Fixed | node-saml validatePostResponseAsync |
| InResponseTo replay protection | ✅ Correct | saml_requests table check |
| OTP preview exposure | ✅ Guarded | NODE_ENV !== 'production' AND EXPOSE_OTP_PREVIEW === 'true' |
| Recovery codes | ✅ Stored hashed | Bcrypt hashed at setup |

---

## Tenant Isolation Review

| Check | Status |
|---|---|
| Table allowlist in TENANT_TABLE_CONFIG | ✅ Present |
| SQL identifier sanitization (assertSafeIdentifier) | ✅ Present |
| Global table writes blocked | ✅ bare_acts, legal_templates marked global, writes rejected |
| Parameterised queries throughout | ✅ No string interpolation in SQL |
| Raw query() usage bypassing tenant helper | ⚠️ Still present in routes.ts for several direct calls — each manually includes tenant_id filter. Acceptable but fragile. |

---

## Priority Fix Order

| Priority | Finding | Effort | Status |
|---|---|---|---|
| 🔴 1 | OIDC client secret: encrypt with APP_ENCRYPTION_KEY at write, decrypt at read | 30 min | ✅ Fixed |
| 🔴 2 | DPDP internal key: make required in production + fail-closed guard | 10 min | ✅ Fixed |
| 🟠 3 | SCIM role allowlist: validate role param before UPDATE | 10 min | ✅ Fixed |
| 🟠 4 | Upload storage: pass mimeType not data.mimetype to uploadFile() | 2 min | ✅ Fixed |
| 🟡 5 | AI service + web NetworkPolicy: add missing policies | 20 min | ✅ Fixed |
| 🟡 6 | Pin container images to SHA digests in deployment.yaml | 30 min | ✅ Fixed |
| 🟡 7 | WebSocket: require explicit ALLOW_UNAUTHED_WS=true for dev bypass | 5 min | ✅ Fixed |
| 🟡 8 | Admin MFA disable: require password + notify affected user by email | 20 min | ✅ Fixed |
| 🟡 9 | NetworkPolicy: narrow namespaceSelector from {} to evidentis namespace | 10 min | ✅ Fixed |
| ℹ️ 10 | DPDP queue: migrate to BullMQ with retry and DLQ | 2 hours | ✅ Fixed |
| ℹ️ 11 | Remove text/html from upload MIME fallback | 5 min | ✅ Fixed |
| ℹ️ 12 | OAuth2: read credentials from DB per tenant | 1 hour | ✅ Fixed |
