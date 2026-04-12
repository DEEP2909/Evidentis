# EvidentIS Issue Remediation Ledger (Session 43)

All issues from the latest `issue.md` audit have been addressed in code, configuration, migrations, or explicit verification.

## ✅ Critical (C1-C7)

| ID | Resolution | Status |
|---|---|---|
| C1 | Fixed `tenant-isolation.ts` tenant context query to use real schema (`plan`, `settings`) and removed invalid unconditional `deleted_at` filtering. | ✅ |
| C2 | Eliminated unsafe dynamic SQL in tenant-isolation helpers via strict table whitelist, identifier validation, and safe `orderBy` parsing. | ✅ |
| C3 | Production compose auth/env wiring moved to RS256 key file paths (`JWT_PRIVATE_KEY_PATH`, `JWT_PUBLIC_KEY_PATH`) and `APP_ENCRYPTION_KEY_FILE` secret path. | ✅ |
| C4 | Encryption key handling hardened: config now enforces 64-hex format and supports `APP_ENCRYPTION_KEY_FILE`; crypto module validates decoded key length. | ✅ |
| C5 | India data locality defaults aligned: initial schema `tenants.region` default now `centralindia`; runtime migration backfills legacy `us-east-1`. | ✅ |
| C6 | Embedding schema defaults aligned in initial migration (`vector(768)`, LaBSE model default). | ✅ |
| C7 | Matter value schema alignment completed for paise compatibility in baseline + runtime (`deal_value_paise`). | ✅ |

## ✅ High (H1-H10)

| ID | Resolution | Status |
|---|---|---|
| H1 | Email brand corrected from `LexOS` to `EvidentIS`. | ✅ |
| H2 | Email template parameter naming normalized from `attorneyName` to `advocateName`. | ✅ |
| H3 | Legacy Paddle baseline drift removed from initial schema for new installs (drop migration already existed for existing DBs). | ✅ |
| H4 | Initial `document_chunks.model_version` default aligned to `sentence-transformers/LaBSE`. | ✅ |
| H5 | Added `documents.file_size_bytes` schema support and document upload now persists actual byte size. | ✅ |
| H6 | US-specific legal test language updated to India-oriented references (Karnataka/Delhi/DPDP examples). | ✅ |
| H7 | Password policy now respects configurable env settings (`PASSWORD_MIN_LENGTH`, uppercase/lowercase/number/special toggles). | ✅ |
| H8 | Traefik dashboard now protected by basic auth + IP allowlist middleware chain. | ✅ |
| H9 | AI cost tracking normalized toward India currency (`estimated_cost_paise`, `cost_currency`), with legacy USD column migration path handled and dropped. | ✅ |
| H10 | `.gitignore` now covers `keys/`, `storage/`, `certs/`, plus additional local artifacts. | ✅ |

## ✅ Medium (M1-M10)

| ID | Resolution | Status |
|---|---|---|
| M1 | OTEL collector image pinned to versioned tag (`0.113.0`) from `latest`. | ✅ |
| M2 | DB module now supports pool reinitialization (`reinitializePool`) instead of immutable one-shot module pool state. | ✅ |
| M3 | Redis runtime mismatch removed by aligning compose to password-protected non-TLS internal Redis URL defaults. | ✅ |
| M4 | SQL injection detector regex narrowed to high-signal attack patterns to reduce false positives on legal text. | ✅ |
| M5 | `scanStream()` refactored to true streaming ClamAV INSTREAM scanning (no full-file memory buffering). | ✅ |
| M6 | Verified `api_keys` migration exists in `20260101000001_auth-tables.js`; no missing migration defect. | ✅ Verified |
| M7 | `cancelPipeline()` no longer creates throwaway Redis connections; now reuses orchestrator singleton queue connection. | ✅ |
| M8 | Billing checkout no longer upgrades tenant plan before payment capture; plan update remains webhook-driven. | ✅ |
| M9 | GST details now persist SAC code `998212` during invoice creation; schema defaults aligned by migration. | ✅ |
| M10 | Worker metrics port moved from `9100` to `9101` (code + k8s annotations/port). | ✅ |

## ✅ Low (L1-L11)

| ID | Resolution | Status |
|---|---|---|
| L1 | `orderBy` in tenant scoped `findMany()` now validated and safely composed from whitelisted columns. | ✅ |
| L2 | AI service rate limiter now fails open when Redis is unavailable (warning + continue), not blanket 503. | ✅ |
| L3 | `generateDocumentKey()` now preserves Unicode letters/numbers for Indian-language filenames. | ✅ |
| L4 | Added `research_history.advocate_id` migration/backfill; research writes now persist `advocate_id` (with compatibility write to `attorney_id`). | ✅ |
| L5 | `checkClamAVHealth()` now performs explicit listener cleanup and guarded resolution flow. | ✅ |
| L6 | AI client identity fallback improved (`x-forwarded-for` / `x-real-ip`) to avoid accidental shared `"unknown"` bucket over-blocking. | ✅ |
| L7 | Added `timeout_graceful_shutdown` to uvicorn run path for safer in-flight request handling. | ✅ |
| L8 | Removed deprecated `version` field from `docker-compose.prod.yml`. | ✅ |
| L9 | Coverage artifacts are ignored; no tracked coverage binaries remained in git index during this pass. | ✅ Verified |
| L10 | `__pycache__` directories are ignored and not currently tracked in git index. | ✅ Verified |
| L11 | `.venv-ai/` added to `.gitignore` to prevent accidental virtualenv commits. | ✅ |

## Verification Snapshot

- `npm run typecheck --workspace=apps/api` ✅
- `npm run test:coverage:ci --workspace=apps/api` ✅
- `npm run typecheck --workspace=apps/web` ✅
- `pytest apps/ai-service/tests -q` ✅ (111 passed)
