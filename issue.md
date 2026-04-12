## ✅ Session 35 issue.md Remediation (2026-04-12)

All items from the latest `issue.md` update are now fixed.

| # | Issue | Status | Resolution |
|---|---|---|---|
| 1 | `docker-compose.prod.yml` used Paddle + US S3 region + wrong embedding model | ✅ Fixed | Replaced Paddle env/secrets with Razorpay equivalents, switched `S3_REGION` default to `centralindia`, and updated AI embedding runtime to `sentence-transformers/LaBSE` with `EMBEDDING_DIM=768`. |
| 2 | `scim.ts` reintroduced `attorney` role and legacy object type | ✅ Fixed | Updated SCIM group roles to `admin/partner/advocate/paralegal/client`, changed group-removal fallback role to `advocate`, and changed SCIM audit `objectType` values from `attorney` to `advocate`. |
| 3 | `sso.ts` JIT provisioning defaulted to `attorney` and inserted non-existent columns | ✅ Fixed | JIT provisioning now defaults to `advocate` and inserts into valid attorneys schema columns (`display_name`, `status`) with normalized email handling. |
| 4 | DB role defaults still set to `attorney` | ✅ Fixed | Patched legacy migration defaults (`20260101000000`, `20260101000001`, `20260401000006`) to `advocate` and added migration `20260412000017_fix-default-role.js` to update defaults/data for existing DBs (`attorneys`, `invitations`, `sso_configs`/`sso_configurations`). |
| 5 | `scripts/seed.ts` obligations + role + tenant naming drift | ✅ Fixed | Replaced US-themed tenant names with India-aligned names, updated assignee matching to role `advocate`, and fixed obligations seeding to valid schema columns (removed `assigned_attorney_id`, inserted proper `document_id`/obligation fields, auto-creates minimal seed document when missing). |
| 6 | `routes.ts` AI cost analytics referenced non-existent cents/tokens columns | ✅ Fixed | Updated AI costs query to valid `ai_model_events` fields (`model_name`, `input_tokens`, `output_tokens`) and paise-based totals; added migration `20260412000018_add-ai-model-cost-paise.js` with backfill from `cost_usd`. |

### Validation snapshot
- `npm run typecheck --workspace=apps/api` ✅
- `npm run test:smoke --workspace=apps/api` ✅
- `npm run typecheck --workspace=apps/web` ✅
- `npm run migrate:up --workspace=apps/api` ⚠️ Blocked locally (no `DATABASE_URL` set in this shell/session)
