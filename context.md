# EvidentIS India Build Context

## Objective
- Transform the USA reference product into a production-oriented India-first legal SaaS.
- Cover Indian legal workflows, Indian states and UTs, multilingual operation, stronger security, and higher automated test coverage.
- Keep this file updated as a running handoff/context log.

## Architecture Progress
- Cloned the reference product into `evidentis_main` and shifted core product language and workflows from US/legal-attorney assumptions to India/advocate terminology.
- Added India-first shared domain data, validators, state and UT coverage, multilingual UI support, India billing defaults, DPDP-oriented configuration, and Razorpay-based billing foundations.
- Expanded API legal rules, billing enforcement, tenant metadata, and India-specific compliance logic.
- Expanded AI-service prompts, extractors, heuristics, explainability, and domain models for India-focused clause extraction and assessment.
- Reworked web copy, navigation, jurisdiction surfaces, and page flows to fit Indian legal operations.

## Security and Hardening Progress
- Production dependency audit is now clean: `npm audit --omit=dev --json` reports `0` vulnerabilities.
- Upgraded key packages, including `next`, `fastify`, `bcrypt`, `node-pg-migrate`, `nodemailer`, and the Fastify plugin stack.
- Added transitive package overrides to eliminate vulnerable dependency paths.
- Removed Google-font build dependency so the frontend build is deterministic in restricted enterprise environments.
- Added explicit API proxy-trust control via `TRUST_PROXY=false` by default instead of trusting forwarded headers automatically in production.
- Disabled Next.js `X-Powered-By` header and set image optimization to unoptimized mode to reduce unnecessary runtime attack surface for this current build.

## Verification Status
- Shared package typecheck: passing.
- API typecheck: passing.
- Web typecheck: passing.
- Shared build: passing.
- API build: passing.
- Web production build: passing on Next.js 15.5.15.
- Shared tests: `9` passing.
- API targeted India tests: `20` passing.
- Web tests: `6` passing.
- AI-service tests: `105` passing.

## Known Gaps
- The broader API integration suite still expects live infrastructure such as PostgreSQL and Redis; in this local environment those suites fail with connection-refused errors rather than application logic regressions.
- There is also a parent-level `context.md` one directory above this project. This project-root file should be treated as the active implementation context for `evidentis_main`.

## Most Recent Changes
- Upgraded Next.js to a patched release and adapted dynamic route pages to the newer async `params` contract.
- Upgraded Fastify and aligned its plugin ecosystem to compatible releases.
- Tightened API bootstrap typing for Fastify 5.
- Stabilized AI-service pytest configuration and removed noisy warnings from routine runs.

## Latest Fixes (Session 25)
- Closed frontend/backend contract drift in web API consumption:
  - Added strict payload normalization and enum/date/state coercion in `apps/web/lib/api.ts`.
  - Corrected auth envelope mapping (`/auth/login`, `/auth/me`) and cookie-based refresh behavior.
  - Updated flags query contract to use backend `severity` filtering.
- Fixed matter document detail page stability:
  - Strongly typed auth headers, removed unused page state, and fixed `useEffect` dependency wiring in `apps/web/app/matters/[id]/documents/[docId]/page.tsx`.
- Standardized flag severity ordering across API routes:
  - `apps/api/src/routes.ts` now orders `critical`, `high`, `medium`, `warn`, `low` consistently in matter/document/portal flag views.
- Added root `issue.md` audit ledger with resolved issues and environment-limited test note.

## Session 25 Verification
- `npm run typecheck` ✅
- `npm run build` ✅
- `npm run test --workspace=packages/shared` ✅
- `npm run test:smoke --workspace=apps/api` ✅
- `npm run test --workspace=apps/web` ✅
- `pytest apps/ai-service/tests -q` ✅ (105 passed)

## Latest Fixes (Session 26)
- Expanded language support to all scheduled Indian languages (+ English) across shared domain constants, web language switching, and i18n initialization.
- Added dynamic RTL handling from language metadata, including Urdu, Kashmiri, and Sindhi.
- Updated billing language entitlements to reference centralized shared language catalogs.
- Aligned API ↔ AI research contract for multilingual output:
  - API now passes `query`, `language`, and explicit `stream` mode.
  - Streaming route now consumes SSE from AI service correctly.
  - AI research router now accepts API-provided chunks/context and language preference.
- Extended AI service OCR language default pack list to include additional Indian language models.
- Updated core docs (`README.md`, `PRODUCT_DOCUMENTATION.md`) from USA-centric and outdated model/language details to India + multilingual alignment.

## Session 26 Verification
- `npm run build --workspace=packages/shared` ✅
- `npm run typecheck --workspace=apps/api` ✅
- `npm run typecheck --workspace=apps/web` ✅
- `npm run build --workspace=apps/api` ✅
- `npm run build --workspace=apps/web` ✅
- `npm run test --workspace=packages/shared` ✅
- `npm run test --workspace=apps/web` ✅
- `npm run test:smoke --workspace=apps/api` ✅
- `pytest apps/ai-service/tests -q` ✅ (105 passed)

## Next Suggested Steps
- Stand up local Postgres and Redis, then run the full API integration suite end to end.
- Add more India-specific API and web tests around state-level compliance variations, billing flows, and multilingual UX for all supported Indian languages.
- Continue expanding legal datasets, citation coverage, and retrieval evaluation for Indian case law and state-specific rules.
