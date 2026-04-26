-- EvidentIS: Soft Deletes for Legal Data Retention
-- Adds deleted_at columns to tables that require 7-year audit retention.
-- Soft-deleted rows are excluded by default via RLS policy updates.

ALTER TABLE documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE matters ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE clauses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE obligations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE audit_events ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Partial indexes for efficient "active only" queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_active ON documents(tenant_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matters_active ON matters(tenant_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clauses_active ON clauses(tenant_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_obligations_active ON obligations(tenant_id, created_at DESC) WHERE deleted_at IS NULL;

-- Update RLS policies to exclude soft-deleted rows for normal operations
-- (Admins/auditors can bypass RLS to see deleted rows when needed)
DO $$ BEGIN

DROP POLICY IF EXISTS tenant_isolation ON documents;
CREATE POLICY tenant_isolation ON documents
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND deleted_at IS NULL);

DROP POLICY IF EXISTS tenant_isolation ON matters;
CREATE POLICY tenant_isolation ON matters
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND deleted_at IS NULL);

DROP POLICY IF EXISTS tenant_isolation ON clauses;
CREATE POLICY tenant_isolation ON clauses
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND deleted_at IS NULL);

DROP POLICY IF EXISTS tenant_isolation ON obligations;
CREATE POLICY tenant_isolation ON obligations
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid AND deleted_at IS NULL);

-- audit_events: Keep deleted rows visible (audit trail must never be hidden)
DROP POLICY IF EXISTS tenant_isolation ON audit_events;
CREATE POLICY tenant_isolation ON audit_events
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

END $$;

COMMENT ON COLUMN documents.deleted_at IS 'Soft delete timestamp for 7-year retention compliance';
COMMENT ON COLUMN matters.deleted_at IS 'Soft delete timestamp for 7-year retention compliance';
