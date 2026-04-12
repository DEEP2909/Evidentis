# EvidentIS Pre-Production Issue Ledger

> **Audit date:** 2026-04-13 (Session 39 — re-verification after user fixes)
> **Scope:** Full codebase — API, AI Service, AI Worker, DB migrations, Docker, CI/CD, Security, India compliance

---

## ✅ Resolved Issues (verified fixed)

| ID | Issue | Fix Applied |
|----|-------|-------------|
| C1 | `tenant-isolation.ts` queried non-existent `subscription_tier`, `features`, `deleted_at` columns | `loadTenantContext()` now queries `plan` + `settings` (actual columns); `deleted_at` usage gated behind `supportsSoftDelete` per-table config |
| C2 | SQL injection via unparameterized table names in tenant-isolation | Added `TENANT_TABLE_CONFIG` whitelist, `getSafeTableName()`, `quoteIdentifier()`, and `assertSafeIdentifier()` — all identifiers are now validated and quoted |
| C3 | Docker prod used `JWT_SECRET` env vars but API uses RS256 PEM files | Prod compose now uses `JWT_PRIVATE_KEY_PATH: /run/secrets/jwt_private_key` and `JWT_PUBLIC_KEY_PATH: /run/secrets/jwt_public_key` |
| C4 | `APP_ENCRYPTION_KEY` expected hex but dev default was plaintext | Dev default is now a valid 64-char hex string; `loadConfig()` validates hex format; `getEncryptionKey()` double-checks with regex |
| C5 | DB schema `region` default was `us-east-1` | Initial migration changed to `'centralindia'`; alignment migration backfills existing rows |
| C6 | Embedding dimension mismatch: `vector(384)` vs config `768` | Initial migration updated to `vector(768)`; model_version default updated to `'sentence-transformers/LaBSE'` |
| C7 | `deal_value_cents` column — no `deal_value_paise` column | Both columns now in initial schema + alignment migration adds `deal_value_paise` for existing DBs |
| H1 | Email template showed old "LexOS" branding | Logo now shows `Evident<span>IS</span>` |
| H2 | Email param names used `attorneyName` | All params renamed to `advocateName` |
| H3 | Dead `paddle_customer_id`/`paddle_subscription_id` columns | Migration `000014_drop-paddle-columns.js` removes them |
| H4 | `model_version` default was `'all-MiniLM-L6-v2'` | Changed to `'sentence-transformers/LaBSE'` |
| H5 | `file_size_bytes` column missing from documents table | Added in initial schema + alignment migration |
| H6 | Test files referenced California/CCPA/Delaware | US legal references removed from tests |
| H7 | `validatePasswordPolicy()` hardcoded `12` instead of using `config.PASSWORD_MIN_LENGTH` | Now uses `config.PASSWORD_MIN_LENGTH` and respects all `PASSWORD_REQUIRE_*` flags |
| H8 | Traefik dashboard with basic auth only | Added `dashboard-ipwhitelist` middleware with configurable `TRAEFIK_DASHBOARD_ALLOWED_IPS` |
| H9 | `cost_usd` column for India-only platform | Changed to `estimated_cost_paise` + `cost_currency` (default `'INR'`); migration backfills + drops legacy column |
| H10 | `.gitignore` missing `keys/`, `storage/`, `certs/`, `.venv-ai/` | All now in `.gitignore` |
| M1 | OTEL collector used `:latest` tag | Pinned to `otel/opentelemetry-collector-contrib:0.113.0` |
| M2 | DB pool module-level instantiation | Refactored to `createPool()` factory function |
| M4 | SQL injection detection had false positives for single words | Patterns now require SQL statement structure (e.g., `union\s+select`, `insert\s+into`) |
| M5 | `scanStream()` buffered entire file into memory | Refactored to pipe stream chunks directly to ClamAV socket |
| M7 | `cancelPipeline()` created throwaway Redis connections | Now uses `getQueueConnection()` shared singleton |
| M8 | `createCheckoutSession` set plan before payment capture | Plan update removed from checkout; only webhook handler sets plan after `payment.captured` |
| M9 | Invoice creation didn't include SAC code | Now inserts into `gst_details` table with SAC code `998212` after invoice creation |
| L1 | `findMany` `orderBy` used string interpolation | Now uses `parseOrderBy()` with per-table `sortableColumns` whitelist |
| L2 | AI service returned 503 when Redis was down | Now fails open — logs warning and allows request through |
| L3 | `generateDocumentKey` stripped Unicode filenames | Regex changed to `[^\p{L}\p{N}._-]` (preserves Indian language characters) |
| L5 | `checkClamAVHealth` socket cleanup issue | `scanStream` now has full `cleanup()` function that removes all listeners |
| L6 | `request.client.host` could be `None` in AI service | Now falls back to `x-forwarded-for` → `x-real-ip` → path-based key |
| L7 | No graceful shutdown for AI service | Added `timeout_graceful_shutdown=30` to uvicorn config |
| L8 | `docker-compose.yml` had deprecated `version: '3.9'` | Removed |
| L9 | Coverage files tracked in git | Added to `.gitignore` |
| L11 | `.venv-ai/` directory not in `.gitignore` | Added `.venv-ai/` to `.gitignore` |

---

## ✅ Session 44 Remediation (2026-04-13)

| ID | Severity | Status | Resolution |
|----|----------|--------|------------|
| R1 | Low | ✅ Verified | `research_history` writes canonical `advocate_id` with `attorney_id` compatibility in the same insert path. |
| R2 | Medium | ✅ Fixed | Removed duplicate default header behavior from `security-hardening.ts`; `@fastify/helmet` remains the source-of-truth for standard headers. |
| R3 | Medium | ✅ Fixed | Removed custom CORS hook from `security-hardening.ts` so only `@fastify/cors` controls CORS headers and preflight behavior. |
| R4 | Low | ✅ Fixed | Injection/XSS detection now scans `query`, `params`, and `body` recursively (including nested objects/arrays). |
| R5 | Low | ✅ Verified | No active 9100 conflict remains; worker metrics path is already on non-conflicting port wiring. |
| R6 | Medium | ✅ Verified | Current production compose no longer has the reported Redis TLS scheme mismatch in active config. |
| R7 | Low | ✅ Verified | `__pycache__` directories are not tracked in the current git index. |
| R8 | Low | ✅ Verified | `.coverage` is not tracked in the current git index. |
| N1 | Medium | ✅ Fixed | Production error passthrough now includes `429`, preserving rate-limit semantics. |
| N2 | Low | ✅ Fixed | `createCheckoutSession` request payload formatting normalized; `notes` remains correctly scoped in Razorpay request body. |
| N3 | Medium | ✅ Fixed | Replaced timestamp invoice IDs with sequential FY format: `EVD/<YYYY-YY>/<NNNN>` using transaction lock for tenant/year safety. |
| N4 | Low | ✅ Fixed | Matter PATCH dynamic update now quotes mapped SQL identifiers (e.g., `"matter_name"`). |
| N5 | Low | ✅ Fixed | Added explicit code comment clarifying legacy `attorneys` table stores advocate records. |

### Remaining Open Items

None in this pass.

---

## Previously Resolved (Sessions 37–38)

| # | Issue | Session |
|---|-------|---------|
| ✅ | API_SERVICE_URL hardcoded to wrong port in ai-worker tasks | 37 |
| ✅ | celery_app.py timezone UTC→Asia/Kolkata | 37 |
| ✅ | obligation_remind.py field name mismatches | 37 |
| ✅ | routes.ts analytics query column mismatches | 37 |
| ✅ | routes.ts review_actions INSERT column mismatch | 37 |
| ✅ | websocket.ts attorneyId→advocateId rename | 37 |
| ✅ | Docker Compose missing API_SERVICE_URL | 37 |
| ✅ | Node coverage threshold raised to 70% | 38 |
| ✅ | Missing advocateId/advocateRole Fastify decorators | 38 |
| ✅ | CI coverage script broadened to full test suite | 38 |
