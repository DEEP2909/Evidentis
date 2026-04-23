Half-done — needs one more push
Resolved
DPDP withdrawal backend exists but the route has no auth middleware
apps/api/src/dpdp.ts — fastify.post('/api/dpdp/consent/withdraw', async ...)
Both /api/dpdp/consent/withdraw and /api/dpdp/consent/status read userId and tenantId from the request object but there's no preHandler: authenticateRequest. If those properties are missing (unauthenticated request), the route manually returns 401 — but this pattern bypasses the standard auth middleware chain and could be circumvented. Add { preHandler: authenticateRequest } to both route definitions to match every other protected route in the codebase.
Resolved
DPDP withdrawal UI button exists but doesn't call the new route
apps/web/app/settings/privacy/page.tsx — "Raise Erasure Request" button
The button renders correctly but has no onClick handler — clicking it does nothing. Wire it to POST /api/dpdp/consent/withdraw with a confirmation dialog before submitting, and show the returned erasureDeadline in a success toast. The backend is ready; this is just the last UI connection.
Resolved
ai_burst rate limiter defined but not applied to any route
apps/api/src/rate-limit.ts defines it — apps/api/src/routes.ts has no reference
ai_burst and createDualRateLimiter are implemented but routes.ts doesn't reference them — grep returns nothing. The burst protection only fires when it's actually registered as a preHandler on the /api/ai/* routes. Add it the same way the existing hourly limiter is registered.
Carried through all three versions — must be addressed
Resolved
Privacy page consent records are still hardcoded demo data
apps/web/app/settings/privacy/page.tsx lines 13–17 — static consentRecords array
"Ananya S.", "Vikram R.", "Rhea P." are hardcoded in the component. The backend has GET /api/dpdp/requests — call it on mount using React Query and render real consent records from the tenant's actual data. The DPDP compliance status cards ("3 controls compliant") are also static strings and should reflect live toggle state from the API.
Introduced in v3
Resolved
test-results/.last-run.json committed — CI artifact in the repo
apps/web/test-results/.last-run.json
A Playwright test run artifact was committed. These should never be in version control — they're ephemeral CI outputs. Add apps/web/test-results/ and apps/web/playwright-report/ to .gitignore. The .gitignore already has /test-results/ at root level but not scoped to the web app subdirectory.
Resolved
DPDP consent table referenced in dpdp.ts doesn't match the existing schema
apps/api/src/dpdp.ts queries dpdp_consent — existing migrations use dpdp_requests
The withdrawal route queries a table called dpdp_consent (UPDATE dpdp_consent SET withdrawn_at = ...) but looking at existing migrations, the DPDP table is called dpdp_requests. Either a new dpdp_consent table needs a migration, or the query in dpdp.ts needs to use the correct existing table name. As-is, the withdrawal route will throw a runtime error (relation "dpdp_consent" does not exist) on any live database.
Resolved
Erasure job queued to Redis list but no worker consumes it
apps/api/src/dpdp.ts → redis.lpush('erasure_jobs', ...) — no consumer in ai-worker/
The withdrawal route pushes a JSON payload to a Redis list called erasure_jobs. No Celery task or BullMQ worker reads from this list. The job will accumulate silently and PII will never actually be erased, making the DPDP compliance promise hollow. Add an erasure.py Celery task that pops from the queue and performs the actual data anonymisation steps.