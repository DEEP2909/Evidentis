# EvidentIS Issue Ledger

> **Audit date:** 2026-04-13 (Session 48)  
> **Scope:** tenant isolation table coverage, SCIM log isolation registration, MSG91 DLT deployment guidance

## Session 48 Results

| ID | Severity | Status | Resolution |
|----|----------|--------|------------|
| 1 | Major | ✅ Fixed | Expanded `TENANT_TABLE_CONFIG` in `apps/api/src/tenant-isolation.ts` to include missing India tables and explicit scope metadata (`column`, `parent`, `global`). Added tenant-safe handling for FK-scoped tables (`invoice_line_items`, `gst_details`) and explicit global-table protections (`bare_acts`, `bare_act_sections`, `legal_templates`, `privacy_notices`, `citation_networks`). |
| 2 | Moderate | ✅ Fixed | Added `scim_sync_logs` to tenant isolation config with `tenantScope: { mode: 'column', column: 'tenant_id' }` and sortable fields. |
| 3 | Minor | ✅ Fixed | Updated `DEPLOYMENT_GUIDE.md` with explicit MSG91 + DLT compliance note: production `MSG91_SENDER_ID` must exactly match approved 6-character TRAI/DLT sender ID. |

## Additional Hardening in This Pass

- Refactored tenant-scoped query helpers (`findById`, `findMany`, `validateTenantOwnership`, `insert`, `update`, `softDelete`) to honor per-table scope mode, including parent-table joins for tenant resolution and explicit write rejection for global tables.

## Verification Snapshot

- `npm run typecheck --workspace=apps/api` ✅
- `npm run test:smoke --workspace=apps/api` ✅
- `npm run test:coverage:ci --workspace=apps/api` ✅
- `npm run typecheck --workspace=apps/web` ✅
- `pytest apps/ai-service/tests -q` ✅ (111 passed)

## Remaining Open Issues

None from this pass.
