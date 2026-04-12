# EvidentIS Issue Ledger

## Session 41 — Resolved (2026-04-12)

| # | Severity | Issue | Status | Resolution |
|---|---|---|---|---|
| 1 | Critical | `ci-smoke.test.ts` webhook assertions targeted an endpoint the issue report flagged as unregistered in route module | Resolved | Registered `POST /webhooks/razorpay` in `apps/api/src/routes.ts` with explicit missing-signature/invalid-signature handling and kept raw-body parsing path in `index.ts`. |
| 2 | Major | `apps/api/package.json` `test:coverage:ci` was scope-limited to smoke-only/bootstrap coverage | Resolved | Restored CI coverage command to full-suite execution: `vitest run --coverage --coverage.reportsDirectory=../../coverage`. |
| 3 | Critical | `apps/ai-worker/Dockerfile` copied missing `requirements.txt` and ignored copied file | Resolved | Removed dead `COPY requirements.txt` step and installed required runtime dependencies directly, including missing `kombu`. |
| 4 | Major | `k8s/deployment.yaml` Celery worker/beat had no liveness probes | Resolved | Added liveness probes for both workloads: Celery inspect ping probe for `celery-worker` and pidfile-based process liveness probe for `celery-beat`. |
| 5 | Major | `k8s/deployment.yaml` celery-worker missing dedicated PDB and NetworkPolicy | Resolved | Added `celery-worker-pdb` (`minAvailable: 1`) and `celery-worker-network-policy` with restricted egress to API (`4000`), AI service (`5000`), and Redis (`6379`). |

## Verification Snapshot

- `npm run typecheck --workspace=apps/api` passed.
- `npm run test:smoke --workspace=apps/api` passed.
- `python -m compileall apps/ai-worker` passed.
- `npm run test:coverage:ci --workspace=apps/api` could not be fully validated locally because the available PostgreSQL instance lacks `pgvector` (`extension "vector" is not available`) needed by migrations; CI environment uses `pgvector/pgvector` for this path.
