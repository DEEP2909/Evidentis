# EvidentIS Issue Ledger

> **Audit date:** 2026-04-13 (Session 45)  
> **Scope:** `docker-compose.prod.yml`, API OTP routes, invoice numbering, AI typing dependencies

## Session 45 Results

| ID | Severity | Status | Resolution |
|----|----------|--------|------------|
| 1 | Critical | ✅ Fixed | `docker-compose.prod.yml` now points to existing Dockerfiles: `apps/api/Dockerfile.api` and `apps/web/Dockerfile.web`. |
| 2 | Major | ✅ Fixed | Removed duplicate OTP endpoints (`/auth/otp/send`, `/auth/otp/verify`); kept canonical `/api/auth/otp/*` routes only. |
| 3 | Moderate | ✅ Fixed | Replaced random invoice IDs in `/api/invoices` with sequential FY format `EVD/YYYY-YY/NNNN` using transaction-scoped advisory lock per tenant/FY. |
| 4 | Moderate | ✅ Fixed | Added `types-redis==4.6.0.20241004` to `apps/ai-service/requirements.txt` to restore Redis typing stubs for mypy. |

## Verification Snapshot

- `npm run typecheck --workspace=apps/api` ✅
- `npm run test:smoke --workspace=apps/api` ✅
- `npm run test:coverage:ci --workspace=apps/api` ✅
- `npm run typecheck --workspace=apps/web` ✅
- `pip install types-redis==4.6.0.20241004` ✅
- `pytest apps/ai-service/tests -q` ✅ (111 passed)

## Remaining Open Issues

None from this audit pass.
