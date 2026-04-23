# Implementation Plan: Addressing issue.md Audit Findings

This plan outlines the actions required to resolve all 17 issues identified in `issue.md`. Many issues appear to be partially or fully resolved by previous commits, so each will be reviewed against the current codebase before applying fixes.

## Proposed Changes

### [Authentication & Security]

#### [CHECK/MODIFY] `apps/api/src/saml.ts` (Issue 1)
- **Status Check:** Verify if `parseSAMLResponse` still uses regex anywhere. It appears to be using `@node-saml/node-saml` for signature verification now. If so, no further action is needed, otherwise, update to use proper signature validation.

#### [MODIFY] `apps/api/src/webauthn.ts` (Issue 2)
- **Change:** Update `storeChallenge` to throw a 503 error if Redis is unavailable in production, removing the in-memory fallback. Catch this error in route handlers and return HTTP 503.

#### [MODIFY] `apps/api/src/sso.ts` (Issue 12)
- **Change:** Replace the in-memory `ssoStates` Map with Redis-backed `storeSsoState` and `consumeSsoState` to ensure reliability in multi-pod deployments.

#### [MODIFY] `apps/api/src/routes.ts` (Issues 7, 8, 9, 10, 11, 13)
- **Issue 7 (OTP Failed Attempts):** Implement per-advocate OTP lockout logic in the OTP verification handler. (Requires DB migration).
- **Issue 8 (FIRM_GSTIN Validation):** Add validation in `PATCH /api/invoices/:id/finalize` to ensure `firm.gstin` is valid before issuing invoices.
- **Issue 9 (MIME Validation):** Ensure `file-type` is used to validate file uploads instead of relying solely on the client-provided `Content-Type`.
- **Issue 10 (Registration Rate Limit):** Add rate limiting configuration to `POST /auth/register`.
- **Issue 11 (MFA Disable Re-auth):** Update `DELETE /api/advocates/:id/mfa` to require and verify the admin's `confirmPassword`.
- **Issue 13 (leadAttorneyId Cleanup):** Remove `leadAttorneyId` from `fieldMap`.

### [Business Logic & Integrations]

#### [MODIFY] `apps/api/src/scim.ts` (Issue 3)
- **Change:** Add `enforceAdvocateLimit` check in `POST /scim/v2/Users` to prevent over-provisioning beyond the tenant's paid plan.

#### [MODIFY] `apps/ai-service/research.py` (Issue 4)
- **Change:** Refuse to answer if retrieval confidence is low (e.g., `< MINIMUM_RETRIEVAL_CONFIDENCE`).

### [Database Migrations]

#### [NEW] `db/migrations/20260424000000_audit-fixes.js`
- **Issue 5:** Add `user_rating`, `user_correction`, `feedback_given_at` to `research_history`.
- **Issue 7:** Add `otp_failed_attempts`, `otp_locked_until` to `advocates`.

### [DevOps & Infrastructure]

#### [MODIFY] `.github/workflows/ci.yml` (Issues 15, 17)
- **Issue 15:** Add a `deploy` job that builds and pushes Docker images and updates the K8s deployment.
- **Issue 17:** Add a regression gate for AI citation accuracy in the `ai-evaluation` job.

#### [NEW] `k8s/postgres-backup-cronjob.yaml` (Issue 16)
- **Issue 16:** Create a Kubernetes CronJob for daily PostgreSQL backups to S3.

## Already Addressed / Verification Needed
- **Issue 5 (Feedback Route):** Verify if `POST /api/research/:id/feedback` exists in `routes.ts`. If not, add it.
- **Issue 6 (DB_SSL Guard):** Verified as implemented in `config.ts`.
- **Issue 14 (otpPreview Leak):** Verified as implemented in `routes.ts`.
