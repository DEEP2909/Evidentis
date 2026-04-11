# EvidentIS India Audit Issues (Session 26)

| # | Area | Severity | Issue | Status | Resolution |
|---|------|----------|-------|--------|------------|
| 1 | Web API client | Critical | `apps/web/lib/api.ts` had strict type mismatches against shared domain unions (`Matter`, `Document`, `Clause`, `Flag`, `Obligation`), breaking type safety and risking invalid runtime values. | ✅ Resolved | Added enum/state/date normalizers and robust DTO mapping (`mapMatter`, `mapDocument`, `mapClause`, `mapFlag`, `mapObligation`, `mapAttorney`) so API payloads are coerced safely. |
| 2 | Auth integration | Critical | Frontend auth assumed body-based refresh flow and direct `/auth/me` shape while backend uses cookie refresh and `{ success, data }` envelopes. | ✅ Resolved | Updated API client to always send credentials, use `/auth/refresh` cookie flow, unwrap envelopes, and normalize `/auth/me` profile mapping. |
| 3 | Matter document detail page | Major | Header typing and hook dependency issues in `apps/web/app/matters/[id]/documents/[docId]/page.tsx` caused fetch typing errors and lint noise. | ✅ Resolved | Strongly typed auth headers, removed unused state, memoized auth header helper, and fixed effect dependencies. |
| 4 | Flag filtering contract | Major | Frontend sent `riskLevel` while backend expected `severity`, causing silent filter drift. | ✅ Resolved | Updated web flags client to send backend-compatible `severity` query parameter. |
| 5 | Flag severity ordering | Moderate | API flag endpoints used inconsistent severity ordering (`warn` vs `medium`/`low`). | ✅ Resolved | Standardized SQL ordering for `critical`, `high`, `medium`, `warn`, and `low` across relevant routes. |
| 6 | Language coverage drift | Critical | Shared constants and web language switcher were limited to 13 languages, below requested “all Indian languages” support. | ✅ Resolved | Expanded shared language catalog to all scheduled Indian languages (+ English), including metadata, RTL languages, and type-safe propagation across app layers. |
| 7 | Web i18n drift vs language catalog | Major | Web i18n and selector used hardcoded language lists and could drift from shared domain config. | ✅ Resolved | Switched to shared `SUPPORTED_LANGUAGES`, added runtime fallback resources for any supported language without dedicated copy, and added explicit supported language registration. |
| 8 | RTL behavior gap | Major | Changing to RTL languages did not reliably update document direction metadata. | ✅ Resolved | Added reactive `lang`/`dir` updates in providers using shared RTL metadata (`ur`, `ks`, `sd`). |
| 9 | API↔AI research contract mismatch | Critical | API research endpoints posted `question` without `stream=false` and streamed from `/research/stream`; AI service expected `/research` model semantics, causing response-shape mismatches. | ✅ Resolved | Added explicit `query` + `stream` contract, language propagation, SSE parsing in API stream route, and AI router compatibility for API-provided chunks/context. |
| 10 | AI OCR language-pack breadth | Major | AI OCR default language pack list did not cover extended Indian legal-language targets. | ✅ Resolved | Expanded `ocr_languages` default pack list in AI config for broader Indian script/language coverage. |
| 11 | Full API integration tests | Moderate | Full `apps/api` integration suite cannot complete in this local environment because required Postgres+pgvector+Redis infra is unavailable. | ⚠️ Blocked (Environment) | Smoke and build/typecheck suites pass; full integration run remains blocked until pgvector-enabled Postgres and Redis are provisioned locally. |

## Validation Snapshot
- ✅ `npm run build --workspace=packages/shared`
- ✅ `npm run typecheck --workspace=apps/api`
- ✅ `npm run typecheck --workspace=apps/web`
- ✅ `npm run build --workspace=apps/api`
- ✅ `npm run build --workspace=apps/web`
- ✅ `npm run test --workspace=packages/shared`
- ✅ `npm run test --workspace=apps/web`
- ✅ `npm run test:smoke --workspace=apps/api`
- ✅ `pytest apps/ai-service/tests -q` (105 passed)
