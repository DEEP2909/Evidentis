# EvidentIS Issue Ledger

## Session 37 — Resolved (2026-04-12)

All issues below have been remediated and verified.

### Issue 1 ✅ — AI-Worker Task Files: API_SERVICE_URL Hardcoded to Wrong Port
**Files:** `obligation_remind.py`, `analytics.py`, `report_gen.py`, `batch_embed.py`, `cleanup.py`
**Root cause:** All 5 files hardcoded `API_SERVICE_URL = 'http://api:3000'` — port 3000 is the Next.js frontend, not the Fastify API (port 4000). Every background task (obligation reminders, analytics, cleanup, embeddings, reports) was silently sending HTTP requests to the frontend and receiving HTML instead of JSON.
**Fix:** All 5 files now use `os.getenv('API_SERVICE_URL', 'http://api:4000')`. `docker-compose.yml` and `docker-compose.prod.yml` updated with `API_SERVICE_URL` in ai-worker and celery-beat environment sections.

### Issue 2 ✅ — routes.ts: Analytics Query Uses Wrong Column on review_actions
**File:** `apps/api/src/routes.ts` (GET `/api/analytics/attorneys`)
**Root cause:** Subquery used `WHERE attorney_id = a.id` — the `review_actions` table schema defines the column as `reviewer_id`. This caused a PostgreSQL runtime error on every analytics page load.
**Fix:** Changed to `WHERE reviewer_id = a.id`.

### Issue 3 ✅ — routes.ts: Analytics Query Uses lead_attorney_id Instead of lead_advocate_id
**File:** `apps/api/src/routes.ts` (GET `/api/analytics/attorneys`)
**Root cause:** Subquery only checked `lead_attorney_id` — post-migration matters use `lead_advocate_id` as the canonical column, silently under-reporting advocate workload.
**Fix:** Changed to `WHERE lead_advocate_id = a.id OR lead_attorney_id = a.id` to cover both canonical and legacy columns.

### Issue 4 ✅ — websocket.ts: AuthenticatedSocket/PresenceEvent Still Uses attorneyId
**File:** `apps/api/src/websocket.ts`
**Root cause:** All WebSocket interfaces and event handlers used `attorneyId`, creating permanent inconsistency with the REST API which uses `advocateId` throughout.
**Fix:** Renamed `attorneyId` → `advocateId` in `AuthenticatedSocket` interface, `PresenceEvent` interface, auth middleware mock, JWT extraction, connection handler, presence events, cursor sharing, typing indicators, disconnect handler, `emitNotification`, `disconnectUser`, and `getConnectedUsers`.

### Issue 5 ✅ — celery_app.py: Timezone UTC Causes Schedules to Fire at Wrong IST Times
**File:** `apps/ai-worker/celery_app.py`
**Root cause:** `timezone='UTC'` with crontab hours written for Indian business hours. Obligation reminders at `hour=8` fired at 1:30 PM IST instead of 8:00 AM IST; cleanup at `hour=3` ran at 8:30 AM IST during peak hours.
**Fix:** Changed to `timezone='Asia/Kolkata'` with `enable_utc=True` (Celery stores timestamps in UTC internally but interprets crontab values in IST).

### Issue 6 ✅ — obligation_remind.py: Uses responsible_attorney and lead_attorney_id
**File:** `apps/ai-worker/tasks/obligation_remind.py`
**Root cause:** Looked up `obligation.get('responsible_attorney')` — `responsible_attorney` doesn't exist in the schema (the column is `responsible_party`, which is a text category not an ID). Also used `matter.get('lead_attorney_id')` instead of `lead_advocate_id`. Both lookups always resolved to None, silently dropping all obligation reminders.
**Fix:** Removed `responsible_attorney` fallback (uses existing `assignees` list only). Changed `lead_attorney_id` → `lead_advocate_id`.

### Additional Issue A1 ✅ — routes.ts: review_actions INSERT Uses Wrong Column Names
**File:** `apps/api/src/routes.ts` (POST `/api/review/feedback`)
**Root cause:** INSERT used columns `attorney_id`, `action`, `notes` — the schema defines them as `reviewer_id`, `action_type`, `note`. Every review action INSERT would fail at runtime with "column does not exist".
**Fix:** Changed INSERT to use `reviewer_id`, `action_type`, `note`.

### Additional Issue A2 ✅ — docker-compose: ai-worker Missing API_SERVICE_URL
**File:** `docker-compose.yml`, `docker-compose.prod.yml`
**Root cause:** ai-worker and celery-beat services had no `API_SERVICE_URL` in their environment, so the env-configurable default in Python code could not be overridden at deploy time.
**Fix:** Added `API_SERVICE_URL=http://api:4000` (dev) and `API_SERVICE_URL=http://api:3001` (prod) to both compose files.

---

## Session 37 Verification
- `npm run typecheck --workspace=apps/api` ✅
- `npm run typecheck --workspace=apps/web` ✅
- `npm run test:smoke --workspace=apps/api` ✅ (2 passed)
- `grep 'http://api:3000' apps/ai-worker/**/*.py` → 0 results ✅
- `grep 'attorneyId' apps/api/src/websocket.ts` → 0 results ✅
- `grep 'responsible_attorney' apps/ai-worker/**/*.py` → 0 results ✅