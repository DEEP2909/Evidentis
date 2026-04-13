# Session 50 Issue Remediation Ledger (Resolved)

## Scope
- Source of truth: latest `issue.md` update (3 reported issues).
- Goal: fix all listed issues end-to-end, update docs only where needed, and keep tenant isolation/runtime behavior safe.

## Resolved Issues

### 1) `sso_configs` vs `sso_configurations` naming drift
**Problem**  
- Migrations originally created `sso_configs` (`20260401000006_add-sso.js`) while runtime code (`sso.ts`, `saml.ts`, tenant isolation config) uses `sso_configurations`.
- This could break tenant helper usage when passed the legacy table name and create environment drift.

**Fix implemented**
1. Added migration: `db/migrations/20260413000021_normalize-sso-config-table.js`
   - `up`: renames `sso_configs` -> `sso_configurations` when needed (idempotent).
   - `down`: renames back only when safe (idempotent).
2. Added tenant table alias in `apps/api/src/tenant-isolation.ts`:
   - `sso_configs` -> `sso_configurations`
   - Ensures helper calls using either name map to canonical runtime behavior.

**Result**
- Schema and runtime naming are aligned.
- Tenant-scoped helper no longer fails for legacy `sso_configs` input.

---

### 2) Missing tenant-scoped tables in `TENANT_TABLE_CONFIG`
**Problem**  
The following tenant tables existed in migrations but were not registered in tenant helper config:
- `analytics_daily`
- `analytics_matters`
- `domain_verifications`
- `identity_links`
- `user_activity`
- `webauthn_credentials`

This could cause `Unsupported tenant-scoped table` errors if helper methods were used for these tables.

**Fix implemented**
- Added all six tables to `apps/api/src/tenant-isolation.ts` with `tenantScope: column(tenant_id)` and appropriate sortable columns.

**Result**
- Tenant helper coverage now matches schema for these tables.

---

### 3) `playbook_rules` exists in config but no migration creates it
**Problem**  
- `playbook_rules` was present in tenant helper config.
- No migration creates it, causing potential runtime relation errors if helper used there.

**Fix implemented**
- Removed `playbook_rules` from `TENANT_TABLE_CONFIG` in `apps/api/src/tenant-isolation.ts`.
- This prevents false confidence from helper-level table registration for a relation that has no migration-backed schema.

**Current risk status**
- Tenant helper behavior is now aligned with actual migrated schema surface.
- Existing playbook runtime paths continue using `playbooks.rules` JSON storage.

---

## Files Changed
- `apps/api/src/tenant-isolation.ts`
  - Added table alias normalization (`sso_configs` -> `sso_configurations`).
  - Added missing tenant table registrations:
    - `analytics_daily`
    - `analytics_matters`
    - `domain_verifications`
    - `identity_links`
    - `user_activity`
    - `webauthn_credentials`
- `db/migrations/20260413000021_normalize-sso-config-table.js`
  - New idempotent SSO table normalization migration.

## Verification Snapshot
- `npm run typecheck --workspace=apps/api` ✅
- `npm run test:smoke --workspace=apps/api` ✅

