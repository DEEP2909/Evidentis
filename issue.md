# Session 51 Issue Remediation Ledger (Resolved)

## Scope
- Source of truth: latest `issue.md` update (4 deployment/docs issues).
- Goal: fix all listed items, keep production behavior safe, update docs only where needed.

## Resolved Issues

### 1) `DEPLOYMENT_GUIDE.md` domain typo (`evidnetis.tech`)
**Problem**
- Deployment guide contained `evidnetis.tech` (typo) in multiple production-critical places.
- This could cause wrong DNS/TLS/webhook setup in production.

**Fix implemented**
- Replaced all `evidnetis` references with `evidentis` in `DEPLOYMENT_GUIDE.md`.
- Updated all affected sections (title, DNS table, env examples, health URLs, webhook URLs, troubleshooting, Kubernetes note).

**Result**
- Deployment runbook now consistently targets the correct domain: `evidentis.tech`.

---

### 2) `docker-compose.prod.yml` DB SSL default risk
**Problem**
- API DB SSL default was `${DB_SSL:-false}` in production compose.
- If unset, DB traffic could run unencrypted.

**Fix implemented**
- Changed API env default to:
  - `DB_SSL: ${DB_SSL:-true}`
  - preserved `DB_SSL_CA: ${DB_SSL_CA:-}`.

**Result**
- Production defaults now enforce encrypted DB connections unless explicitly overridden.

---

### 3) Missing required production vars in `.env.example`
**Problem**
- `DOMAIN`, `NEXTAUTH_SECRET`, and `ACME_EMAIL` were used by production compose but absent from `.env.example`.
- Also needed explicit release tag example.

**Fix implemented**
- Added production section to `.env.example`:
  - `DOMAIN=evidentis.tech`
  - `NEXTAUTH_SECRET=`
  - `ACME_EMAIL=admin@evidentis.tech`
  - `EVIDENTIS_VERSION=1.0.0`

**Result**
- `.env.example` now includes the key production variables required by compose deployment.

---

### 4) Misleading runtime `NEXT_PUBLIC_*` vars in web compose env
**Problem**
- `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WS_URL` were set in both `build.args` and runtime `environment`.
- For Next.js, `NEXT_PUBLIC_*` are build-time inlined values; runtime entries are misleading.

**Fix implemented**
- Removed runtime `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` from `web.environment` in `docker-compose.prod.yml`.
- Kept them only in `web.build.args`.

**Result**
- Compose config now matches actual Next.js env semantics and avoids operator confusion.

---

## Files Changed
- `DEPLOYMENT_GUIDE.md`
- `docker-compose.prod.yml`
- `.env.example`

## Verification Snapshot
- `npm run typecheck --workspace=apps/api` ✅
- `npm run typecheck --workspace=apps/web` ✅
- `npm run test:smoke --workspace=apps/api` ✅

