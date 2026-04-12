# EvidentIS Issue Ledger

## Session 40 — Resolved (2026-04-12)

| # | Severity | Issue | Status | Resolution |
|---|---|---|---|---|
| 1 | Critical | `docker-compose.prod.yml` API port routing mismatch (`4000` runtime vs `3001` health/Traefik) | Resolved | Updated API healthcheck to `http://localhost:4000/health/live`, set Traefik API service port to `4000`, and aligned Traefik healthcheck path to `/health/live`. |
| 2 | Critical | `docker-compose.prod.yml` AI service URL/healthcheck mismatch (`8000` vs actual `5000`) | Resolved | Updated API and ai-worker `AI_SERVICE_URL` to `http://ai-service:5000` and AI service healthcheck to `http://localhost:5000/health`. |
| 3 | Critical | `docker-compose.prod.yml` ai-worker and celery-beat used `API_SERVICE_URL=http://api:3001` | Resolved | Updated both worker services to `API_SERVICE_URL=http://api:4000` and aligned the ai-worker Celery queue list with configured queue names (`default,embeddings,reports,notifications,analytics,cleanup`). |
| 4 | Critical | ai-worker tasks read `INTERNAL_SERVICE_KEY` while platform uses `AI_SERVICE_INTERNAL_KEY` | Resolved | Updated `get_internal_key()` in all 5 ai-worker task modules to read `AI_SERVICE_INTERNAL_KEY`; added `AI_SERVICE_INTERNAL_KEY` to ai-worker environment in production compose. |
| 5 | Critical | `k8s/deployment.yaml` missing Celery worker/beat deployments | Resolved | Added `celery-worker` (replicas: 2) and `celery-beat` (replicas: 1) deployments with Redis/DB/API/AI/internal-key env wiring and production-safe commands. |

## Verification Snapshot

- `npm run typecheck --workspace=apps/api` passed.
- `npm run test:smoke --workspace=apps/api` passed.
- `python -m compileall apps/ai-worker` passed.
