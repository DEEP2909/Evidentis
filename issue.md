Partially addressed — needs completion
Partial
AiFeedbackButton exists but only wired on the research page
apps/web/app/research/page.tsx ✓ — documents/, nyay-assist/ ✗
The component is used exactly once — on the research results page. It's missing from clause extraction results, risk assessment cards, redline suggestions, and obligation extraction output. Add it to every AI result card. The API endpoint (POST /api/ai-feedback) already exists per the component's graceful fallback.
Partial
UpgradePrompt built but never imported — quota errors still show raw API errors
components/shared/UpgradePrompt.tsx built — no import in documents/, research/, nyay-assist/
QuotaError is correctly thrown by api.ts on 402 responses, but none of the pages that trigger AI operations (documents, research, nyay-assist) catch it and show the UpgradePrompt modal. Add a catch (e) { if (e instanceof QuotaError) setShowUpgrade(true) } to each page.
Partial
CSP header present but still uses unsafe-inline and unsafe-eval
apps/web/next.config.js lines 19–20
Having a CSP is much better than nothing, but 'unsafe-inline' in script-src and 'unsafe-eval' effectively neutralise the XSS protection the header is supposed to provide. Next.js supports nonce-based CSP — use next/headers to generate a per-request nonce and add it to both the CSP header and your inline script tags. This is the correct long-term fix.
Partial
Trial banner reads from localStorage — trial end date not set on login
AppShell.tsx reads localStorage key — login flow doesn't write it
The banner logic reads evidentis_trial_ends_at from localStorage, but the login/registration API response needs to include trialEndsAt and the auth store needs to write it. If the key is never set, the banner never appears. Wire it in the login response handler.
Partial
Onboarding checklist uses localStorage — step completion not tracked server-side
apps/web/app/dashboard/page.tsx → OnboardingChecklist
Steps are marked complete in localStorage only. If the admin clears their browser data or logs in from a different device, they see the checklist again even though they've already invited advocates and uploaded documents. Track completion server-side in a tenant_onboarding table and check it on dashboard load.
Carried over — still not addressed
Open
Registration page still calls a mock API — real users can't sign up
apps/web/app/register/page.tsx line 72: "// Mock registration - in real app, call API"
The form validates, but onSubmit only logs data to the console and shows a success toast, then redirects to the dashboard. No actual tenant or user is created. The API route for tenant registration needs to be built (POST /api/auth/register) and called here.
Open
Dashboard KPI cards are still hardcoded demo numbers
apps/web/app/dashboard/page.tsx — all 4 role dashboards
Despite the role-based split, every role's KPI values are still static strings ("34", "8", "12", "78%"). Call GET /api/analytics/summary on mount and replace static values with real data. The analytics worker already aggregates these metrics hourly — the data exists, it just needs to flow to the UI.
Open
Admin team member list is hardcoded demo data
apps/web/app/admin/page.tsx line 49: static MOCK_MEMBERS array
"Aarav Mehta", "Priya Sharma" etc. are hardcoded. A real admin managing their firm will see these fake names regardless of who is actually in their tenant. Replace with a GET /api/admin/members call on mount.
Open
DPDP consent withdrawal (right to erasure) not implemented
apps/api/src/routes.ts — POST /api/dpdp/consent exists, withdrawal does not
The DPDP Act requires a withdrawal mechanism. There is no POST /api/dpdp/consent/withdraw route and no downstream erasure job. A firm using this platform to process client PII without a withdrawal path is in non-compliance. Add the route, queue an erasure job, and surface a "Withdraw Consent" button in the client portal settings.
Open
pgvector index is IVFFlat — should migrate to HNSW for production
db/migrations/20260101000002_vector-index.js
IVFFlat requires VACUUM ANALYZE and manual lists retuning as data grows, and degrades in recall with dynamic inserts (which is your pattern — documents come in continuously). Add a new migration that replaces it with an HNSW index: USING hnsw (embedding vector_cosine_ops) WITH (m=16, ef_construction=64). HNSW is maintenance-free and handles incremental inserts correctly.
Open
No per-minute burst rate limit on AI endpoints — only hourly caps
apps/api/src/rate-limit.ts → RATE_LIMITS.ai = 200 req/hour
A tenant can fire all 200 requests in 30 seconds and starve every other tenant on the shared Ollama instance. Add a secondary 1-minute window (e.g. 5 AI requests/minute/tenant) using the existing Redis rate limiter. Both limits apply: the per-minute burst limit and the hourly quota.
Open
Obligation calendar nav has no due-soon badge
apps/web/components/india/AppShell.tsx → calendar nav item
No count indicator on the calendar icon showing obligations due in the next 7 days. A red badge here is one of the fastest ways to drive daily engagement. Fetch GET /api/obligations?due_within_days=7&count=true and overlay the count on the nav icon.
New issues introduced in this version
New
skills-main/ directory accidentally bundled into the repo zip
Evidentis-main/skills-main/ — 100+ extra files
The zip contains a skills-main/skills-main/skills/ directory with Claude skill definitions (docx, pptx, xlsx, pdf, frontend-design, etc.). These are unrelated to Evidentis and add ~100 files. Remove from the repo and add skills-main/ to .gitignore.
New
Root tsconfig.json added but references no workspaces
/tsconfig.json — new file in repo root
A bare tsconfig.json was added at the repo root but doesn't reference the actual workspace packages. This can cause TypeScript tooling (VSCode, ts-node, tsc) to resolve types incorrectly when run from the root. Either remove it or configure it as a proper project reference file pointing to apps/api, apps/web, and packages/shared.
New
QuotaError is defined twice — in api.ts and in UpgradePrompt.tsx
apps/web/lib/api.ts line 104 AND apps/web/components/shared/UpgradePrompt.tsx line 104
The exact same QuotaError class is defined in both files. Pages that import UpgradePrompt will throw a QuotaError from api.ts but catch it against UpgradePrompt.tsx's class — these are different class instances so instanceof will return false and the modal will never show. Remove the duplicate from UpgradePrompt.tsx and import it from api.ts.
New
Portal register page also calls a mock — no API integration
apps/web/app/portal/register/page.tsx
The new stakeholder registration page follows the same mock pattern as the main register page — form validates but no API is called. Stakeholders invited by a law firm can fill in the form but no account is created. This and the main register page need the same fix: a real POST /api/auth/register call.
New
frontend_promt.md committed to the repo root
/frontend_promt.md — development prompt document, not product code
This is an internal development planning document (22 routes audit, stakeholder groups, issue list). It shouldn't be in the repository — it reveals internal architectural decisions and issue tracking. Move to a private Notion/doc and add *_promt.md or frontend_promt.md to .gitignore.