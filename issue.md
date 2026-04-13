# EvidentIS Issue Ledger

> **Audit date:** 2026-04-13 (Session 47)  
> **Scope:** CSP consistency, degraded limiter clarity, migration rollback ownership

## Session 47 Results

| ID | Severity | Status | Resolution |
|----|----------|--------|------------|
| 1 | Low | ✅ Fixed | `apps/api/src/security-hardening.ts` now uses `setHeaderIfMissing` for `Content-Security-Policy`, matching the same pattern as all other headers. |
| 2 | Low | ✅ Fixed | Added explicit warning comment in `apps/ai-service/main.py` documenting degraded local limiter scope (process-local fallback, Redis is source-of-truth for shared limits). |
| 3 | Moderate | ✅ Fixed | Updated `db/migrations/20260412000019_schema-alignment-fixes.js` down migration to avoid dropping `deal_value_paise` since ownership remains with migration `20260411000015_add-matter-paise.js`. |

## Verification Snapshot

- `npm run typecheck --workspace=apps/api` ✅
- `npm run test:smoke --workspace=apps/api` ✅
- `npm run test:coverage:ci --workspace=apps/api` ✅
- `npm run typecheck --workspace=apps/web` ✅
- `pytest apps/ai-service/tests -q` ✅ (111 passed)

## Remaining Open Issues

None from this pass.
