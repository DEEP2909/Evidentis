## ✅ Session 34 issue.md Remediation (2026-04-12)

All issues currently listed in `issue.md` have been fixed.

| # | Issue | Status | Resolution |
|---|---|---|---|
| 1 | `docker-compose.yml` ai-service embedding config drift | ✅ Fixed | Updated to `EMBEDDING_MODEL=sentence-transformers/LaBSE` and `EMBEDDING_DIM=768`; added `AI_SERVICE_INTERNAL_KEY` passthrough. |
| 2 | `repository.ts` default role still `attorney` | ✅ Fixed | Changed `attorneyRepo.create()` default role to `advocate`. |
| 3 | `ATTORNEY_ROLES` reintroduced `attorney` in shared types | ✅ Fixed | Replaced with `ATTORNEY_ROLES = ADVOCATE_ROLES` and `type AttorneyRole = AdvocateRole`. |
| 4 | `attorneyRepo.create()` not persisting canonical bar council columns | ✅ Fixed | Insert now writes `bar_council_enrollment_number` and `bar_council_state` with backward-compatible fallbacks from legacy bar fields. |
| 5 | `Tenant` interface still contained dropped Paddle field | ✅ Fixed | Removed `paddleCustomerId` from `packages/shared/src/index.ts`. |
| 6 | AI rate limit used in-memory window state | ✅ Fixed | Replaced with Redis-backed per-IP+path counters in `apps/ai-service/main.py`; test fixture now provides async Redis mock for deterministic test runs. |
| 7 | `audit_events.actor_attorney_id` naming drift | ✅ Fixed | Added migration `20260412000016_rename-audit-actor-column.js`; updated API repository/routes and security test to use `actor_advocate_id`. |

### Validation snapshot
- `npm run typecheck --workspace=packages/shared` ✅
- `npm run typecheck --workspace=apps/api` ✅
- `npm run test:smoke --workspace=apps/api` ✅
- `mypy main.py config.py domain_models.py explainability.py llm_safety.py prompts routers models evaluation tests/test_ai_service.py tests/test_domain_models.py tests/test_explainability.py tests/test_llm_safety.py tests/test_router_logic.py tests/test_research_helpers.py --ignore-missing-imports` ✅
- `pytest apps/ai-service/tests -q` ✅ (111 passed)
