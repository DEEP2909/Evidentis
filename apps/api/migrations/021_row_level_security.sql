-- EvidentIS: Row-Level Security (RLS) Policies
-- Defense-in-depth layer for tenant isolation.
-- Application sets `app.tenant_id` on every connection; RLS enforces it at DB level.

-- Helper: idempotent enable + policy creation
-- We use DO blocks so re-running the migration is safe.

DO $$ BEGIN

-- ── attorneys ────────────────────────────────────────────────────────────────
ALTER TABLE attorneys ENABLE ROW LEVEL SECURITY;
ALTER TABLE attorneys FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON attorneys;
CREATE POLICY tenant_isolation ON attorneys
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ── matters ──────────────────────────────────────────────────────────────────
ALTER TABLE matters ENABLE ROW LEVEL SECURITY;
ALTER TABLE matters FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON matters;
CREATE POLICY tenant_isolation ON matters
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ── documents ────────────────────────────────────────────────────────────────
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON documents;
CREATE POLICY tenant_isolation ON documents
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ── document_chunks ──────────────────────────────────────────────────────────
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON document_chunks;
CREATE POLICY tenant_isolation ON document_chunks
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ── clauses ──────────────────────────────────────────────────────────────────
ALTER TABLE clauses ENABLE ROW LEVEL SECURITY;
ALTER TABLE clauses FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON clauses;
CREATE POLICY tenant_isolation ON clauses
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ── obligations ──────────────────────────────────────────────────────────────
ALTER TABLE obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE obligations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON obligations;
CREATE POLICY tenant_isolation ON obligations
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ── invoices ─────────────────────────────────────────────────────────────────
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON invoices;
CREATE POLICY tenant_isolation ON invoices
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ── research_history ─────────────────────────────────────────────────────────
ALTER TABLE research_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_history FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON research_history;
CREATE POLICY tenant_isolation ON research_history
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ── audit_events ─────────────────────────────────────────────────────────────
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON audit_events;
CREATE POLICY tenant_isolation ON audit_events
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ── advocate_otps ────────────────────────────────────────────────────────────
ALTER TABLE advocate_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE advocate_otps FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON advocate_otps;
CREATE POLICY tenant_isolation ON advocate_otps
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ── refresh_tokens ───────────────────────────────────────────────────────────
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON refresh_tokens;
CREATE POLICY tenant_isolation ON refresh_tokens
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ── dpdp_requests ────────────────────────────────────────────────────────────
ALTER TABLE dpdp_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE dpdp_requests FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON dpdp_requests;
CREATE POLICY tenant_isolation ON dpdp_requests
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ── sso_configurations ──────────────────────────────────────────────────────
ALTER TABLE sso_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sso_configurations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON sso_configurations;
CREATE POLICY tenant_isolation ON sso_configurations
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ── ai_prompt_interactions ──────────────────────────────────────────────────
ALTER TABLE ai_prompt_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompt_interactions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON ai_prompt_interactions;
CREATE POLICY tenant_isolation ON ai_prompt_interactions
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ── tenants (global — no RLS, superuser-only) ────────────────────────────────
-- tenants table is NOT RLS'd because it's the root; tenant lookup happens before
-- app.tenant_id is set.

END $$;

COMMENT ON POLICY tenant_isolation ON attorneys IS 'RLS: isolate rows by app.tenant_id session variable';
