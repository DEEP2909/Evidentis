# EvidentIS Issue Ledger

> **Audit date:** 2026-04-13 (Session 46)  
> **Scope:** API security hardening defaults, DB pool reinit safety, AI rate-limit degraded mode, migration clarity

## Session 46 Results

| ID | Severity | Status | Resolution |
|----|----------|--------|------------|
| 1 | Critical | ✅ Fixed | Restored full `DEFAULT_SECURITY_CONFIG` in `apps/api/src/security-hardening.ts` and applied non-overriding header fallback behavior (`setHeaderIfMissing`) to avoid collisions with Helmet while keeping defaults active. |
| 2 | Major | ✅ Fixed | Added controlled drain wait before closing previous pool in `apps/api/src/database.ts` (`POOL_REINITIALIZE_DRAIN_MS = 5000`) to reduce in-flight query disruption during `reinitializePool()`. |
| 3 | Critical | ✅ Fixed | Replaced AI rate-limit fail-open path with degraded local limiter in `apps/ai-service/main.py` when Redis is unavailable/errors; requests now receive `429` after conservative local threshold. |
| 4 | Low | ✅ Verified | Worker metrics annotation remains correct at `9101` for worker pods in `k8s/deployment.yaml`; no ai-service `9101` misconfiguration present in active manifest. |
| 5 | Low | ✅ Fixed | Added migration comment in `db/migrations/20260412000019_schema-alignment-fixes.js` documenting intentional `deal_value_paise` redundancy with migration `20260411000015_add-matter-paise.js`. |

## Verification Snapshot

- `npm run typecheck --workspace=apps/api` ✅
- `npm run test:smoke --workspace=apps/api` ✅
- `npm run test:coverage:ci --workspace=apps/api` ✅
- `npm run typecheck --workspace=apps/web` ✅
- `pytest apps/ai-service/tests -q` ✅ (111 passed)

## Remaining Open Issues

None from this pass.
