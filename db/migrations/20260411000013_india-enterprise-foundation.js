/* eslint-disable camelcase */
/**
 * EvidentIS India Foundation Migration
 * Adds India-specific legal, billing, privacy, and court operations schema.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE tenants
      ADD COLUMN IF NOT EXISTS gstin text,
      ADD COLUMN IF NOT EXISTS bar_council_state text,
      ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'en',
      ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'INR',
      ADD COLUMN IF NOT EXISTS dpdp_consent_given_at timestamptz,
      ADD COLUMN IF NOT EXISTS dpdp_consent_ip inet,
      ADD COLUMN IF NOT EXISTS razorpay_customer_id text,
      ADD COLUMN IF NOT EXISTS razorpay_subscription_id text,
      ADD COLUMN IF NOT EXISTS firm_gstin text,
      ADD COLUMN IF NOT EXISTS data_residency_region text NOT NULL DEFAULT 'centralindia';
  `);

  pgm.sql(`
    ALTER TABLE attorneys
      ADD COLUMN IF NOT EXISTS phone_number text,
      ADD COLUMN IF NOT EXISTS bar_council_enrollment_number text,
      ADD COLUMN IF NOT EXISTS bar_council_state text,
      ADD COLUMN IF NOT EXISTS bci_enrollment_number text,
      ADD COLUMN IF NOT EXISTS whatsapp_number text,
      ADD COLUMN IF NOT EXISTS otp_enabled boolean NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS otp_last_sent_at timestamptz;
  `);

  pgm.sql(`
    UPDATE attorneys
    SET bar_council_state = COALESCE(bar_council_state, bar_state)
    WHERE bar_council_state IS NULL AND bar_state IS NOT NULL;
  `);

  pgm.sql(`
    ALTER TABLE matters
      ADD COLUMN IF NOT EXISTS court_name text,
      ADD COLUMN IF NOT EXISTS case_type text,
      ADD COLUMN IF NOT EXISTS cnr_number text,
      ADD COLUMN IF NOT EXISTS client_phone text,
      ADD COLUMN IF NOT EXISTS client_preferred_language text,
      ADD COLUMN IF NOT EXISTS lead_advocate_id uuid REFERENCES attorneys(id);
  `);

  pgm.sql(`
    UPDATE matters
    SET lead_advocate_id = lead_attorney_id
    WHERE lead_advocate_id IS NULL AND lead_attorney_id IS NOT NULL;
  `);

  pgm.sql(`
    DROP INDEX IF EXISTS idx_document_chunks_embedding;
    ALTER TABLE document_chunks
      ALTER COLUMN embedding TYPE vector(768),
      ALTER COLUMN model_version SET DEFAULT 'sentence-transformers/LaBSE';
    CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
      ON document_chunks
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
  `);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS bare_acts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL,
      short_title text NOT NULL,
      year integer NOT NULL,
      act_number text,
      jurisdiction text NOT NULL DEFAULT 'india',
      language text NOT NULL DEFAULT 'en',
      is_active boolean NOT NULL DEFAULT true,
      replaced_by_act_id uuid REFERENCES bare_acts(id),
      full_text_url text,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS bare_act_sections (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      act_id uuid NOT NULL REFERENCES bare_acts(id) ON DELETE CASCADE,
      section_number text NOT NULL,
      section_title text,
      section_text text NOT NULL,
      subsections jsonb NOT NULL DEFAULT '[]'::jsonb,
      cross_references text[] NOT NULL DEFAULT ARRAY[]::text[],
      tags text[] NOT NULL DEFAULT ARRAY[]::text[],
      embedding vector(768),
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS section_bookmarks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      advocate_id uuid REFERENCES attorneys(id) ON DELETE SET NULL,
      bare_act_section_id uuid NOT NULL REFERENCES bare_act_sections(id) ON DELETE CASCADE,
      note text,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (tenant_id, advocate_id, bare_act_section_id)
    );

    CREATE TABLE IF NOT EXISTS case_citations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
      citation_number text NOT NULL,
      court text NOT NULL,
      judgment_date date,
      parties jsonb NOT NULL DEFAULT '{}'::jsonb,
      acts_cited text[] NOT NULL DEFAULT ARRAY[]::text[],
      sections_cited text[] NOT NULL DEFAULT ARRAY[]::text[],
      summary text NOT NULL DEFAULT '',
      full_text_url text,
      embedding vector(768),
      language text NOT NULL DEFAULT 'en',
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS citation_networks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      case_citation_id uuid NOT NULL REFERENCES case_citations(id) ON DELETE CASCADE,
      cited_case_citation_id uuid NOT NULL REFERENCES case_citations(id) ON DELETE CASCADE,
      relation_type text NOT NULL DEFAULT 'cites',
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (case_citation_id, cited_case_citation_id, relation_type)
    );

    CREATE TABLE IF NOT EXISTS saved_judgments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      matter_id uuid REFERENCES matters(id) ON DELETE SET NULL,
      case_citation_id uuid NOT NULL REFERENCES case_citations(id) ON DELETE CASCADE,
      saved_by uuid REFERENCES attorneys(id) ON DELETE SET NULL,
      notes text,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS court_cases (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      matter_id uuid REFERENCES matters(id) ON DELETE SET NULL,
      cnr_number text NOT NULL UNIQUE,
      court_name text NOT NULL,
      court_complex text,
      case_type text,
      filing_date date,
      current_status text,
      next_hearing_date timestamptz,
      last_synced_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS hearing_dates (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      court_case_id uuid NOT NULL REFERENCES court_cases(id) ON DELETE CASCADE,
      matter_id uuid REFERENCES matters(id) ON DELETE SET NULL,
      hearing_date timestamptz NOT NULL,
      purpose text,
      result text,
      next_date timestamptz,
      advocate_id uuid REFERENCES attorneys(id) ON DELETE SET NULL,
      notes text,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS cause_lists (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      court_case_id uuid REFERENCES court_cases(id) ON DELETE SET NULL,
      court_name text NOT NULL,
      cause_date date NOT NULL,
      source_url text,
      parsed_content jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS legal_templates (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      category text NOT NULL,
      jurisdiction text NOT NULL DEFAULT 'india',
      applicable_acts text[] NOT NULL DEFAULT ARRAY[]::text[],
      language text NOT NULL DEFAULT 'en',
      template_content text NOT NULL,
      variables jsonb NOT NULL DEFAULT '{}'::jsonb,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS legal_notices (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      matter_id uuid REFERENCES matters(id) ON DELETE SET NULL,
      notice_type text NOT NULL,
      language text NOT NULL DEFAULT 'en',
      subject text NOT NULL,
      facts text NOT NULL,
      generated_document_id uuid REFERENCES documents(id) ON DELETE SET NULL,
      sent_at timestamptz,
      response_deadline_at timestamptz,
      created_by uuid REFERENCES attorneys(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      matter_id uuid REFERENCES matters(id) ON DELETE SET NULL,
      client_name text NOT NULL,
      client_gstin text,
      firm_gstin text,
      invoice_number text NOT NULL,
      issue_date date NOT NULL,
      due_date date NOT NULL,
      subtotal_paise bigint NOT NULL,
      gst_rate numeric(5,2) NOT NULL DEFAULT 18.00,
      gst_amount_paise bigint NOT NULL DEFAULT 0,
      total_paise bigint NOT NULL,
      status text NOT NULL DEFAULT 'draft',
      razorpay_payment_id text,
      created_by uuid REFERENCES attorneys(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (tenant_id, invoice_number)
    );

    CREATE TABLE IF NOT EXISTS invoice_line_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      description text NOT NULL,
      quantity numeric(12,2) NOT NULL DEFAULT 1,
      unit_amount_paise bigint NOT NULL,
      total_amount_paise bigint NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS gst_details (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      sac_code text NOT NULL DEFAULT '9982',
      gst_rate numeric(5,2) NOT NULL DEFAULT 18.00,
      taxable_amount_paise bigint NOT NULL,
      cgst_amount_paise bigint NOT NULL DEFAULT 0,
      sgst_amount_paise bigint NOT NULL DEFAULT 0,
      igst_amount_paise bigint NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      advocate_id uuid REFERENCES attorneys(id) ON DELETE CASCADE,
      channel text NOT NULL,
      type text NOT NULL,
      content text NOT NULL,
      language text NOT NULL DEFAULT 'en',
      sent_at timestamptz,
      status text NOT NULL DEFAULT 'pending',
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS advocate_otps (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
      advocate_id uuid REFERENCES attorneys(id) ON DELETE CASCADE,
      phone_number text NOT NULL,
      purpose text NOT NULL,
      otp_hash text NOT NULL,
      expires_at timestamptz NOT NULL,
      consumed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS dpdp_requests (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      advocate_id uuid REFERENCES attorneys(id) ON DELETE SET NULL,
      request_type text NOT NULL,
      status text NOT NULL DEFAULT 'open',
      details text,
      resolved_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS privacy_notices (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      language text NOT NULL,
      version text NOT NULL,
      content text NOT NULL,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (language, version)
    );
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_bare_act_sections_act_id ON bare_act_sections(act_id);
    CREATE INDEX IF NOT EXISTS idx_bare_act_sections_embedding ON bare_act_sections USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
    CREATE INDEX IF NOT EXISTS idx_case_citations_tenant_id ON case_citations(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_case_citations_embedding ON case_citations USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
    CREATE INDEX IF NOT EXISTS idx_court_cases_tenant_status ON court_cases(tenant_id, current_status);
    CREATE INDEX IF NOT EXISTS idx_hearing_dates_case_date ON hearing_dates(court_case_id, hearing_date);
    CREATE INDEX IF NOT EXISTS idx_notifications_tenant_status ON notifications(tenant_id, status);
    CREATE INDEX IF NOT EXISTS idx_advocate_otps_phone_purpose ON advocate_otps(phone_number, purpose);
    CREATE INDEX IF NOT EXISTS idx_dpdp_requests_tenant_status ON dpdp_requests(tenant_id, status);
  `);

  pgm.sql(`
    CREATE OR REPLACE VIEW advocates AS
    SELECT
      id,
      tenant_id,
      email,
      display_name,
      role,
      practice_group,
      COALESCE(bar_council_enrollment_number, bar_number) AS bar_council_enrollment_number,
      bar_council_state,
      bci_enrollment_number,
      phone_number,
      preferred_language,
      status,
      created_at
    FROM attorneys;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP VIEW IF EXISTS advocates;
    DROP TABLE IF EXISTS privacy_notices;
    DROP TABLE IF EXISTS dpdp_requests;
    DROP TABLE IF EXISTS advocate_otps;
    DROP TABLE IF EXISTS notifications;
    DROP TABLE IF EXISTS gst_details;
    DROP TABLE IF EXISTS invoice_line_items;
    DROP TABLE IF EXISTS invoices;
    DROP TABLE IF EXISTS legal_notices;
    DROP TABLE IF EXISTS legal_templates;
    DROP TABLE IF EXISTS cause_lists;
    DROP TABLE IF EXISTS hearing_dates;
    DROP TABLE IF EXISTS court_cases;
    DROP TABLE IF EXISTS saved_judgments;
    DROP TABLE IF EXISTS citation_networks;
    DROP TABLE IF EXISTS case_citations;
    DROP TABLE IF EXISTS section_bookmarks;
    DROP TABLE IF EXISTS bare_act_sections;
    DROP TABLE IF EXISTS bare_acts;
  `);

  pgm.sql(`
    DROP INDEX IF EXISTS idx_document_chunks_embedding;
    ALTER TABLE document_chunks
      ALTER COLUMN embedding TYPE vector(384),
      ALTER COLUMN model_version SET DEFAULT 'all-MiniLM-L6-v2';
    CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
      ON document_chunks
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
  `);

  pgm.sql(`
    ALTER TABLE matters
      DROP COLUMN IF EXISTS lead_advocate_id,
      DROP COLUMN IF EXISTS client_preferred_language,
      DROP COLUMN IF EXISTS client_phone,
      DROP COLUMN IF EXISTS cnr_number,
      DROP COLUMN IF EXISTS case_type,
      DROP COLUMN IF EXISTS court_name;

    ALTER TABLE attorneys
      DROP COLUMN IF EXISTS otp_last_sent_at,
      DROP COLUMN IF EXISTS otp_enabled,
      DROP COLUMN IF EXISTS whatsapp_number,
      DROP COLUMN IF EXISTS bci_enrollment_number,
      DROP COLUMN IF EXISTS bar_council_state,
      DROP COLUMN IF EXISTS bar_council_enrollment_number,
      DROP COLUMN IF EXISTS phone_number;

    ALTER TABLE tenants
      DROP COLUMN IF EXISTS data_residency_region,
      DROP COLUMN IF EXISTS firm_gstin,
      DROP COLUMN IF EXISTS razorpay_subscription_id,
      DROP COLUMN IF EXISTS razorpay_customer_id,
      DROP COLUMN IF EXISTS dpdp_consent_ip,
      DROP COLUMN IF EXISTS dpdp_consent_given_at,
      DROP COLUMN IF EXISTS currency,
      DROP COLUMN IF EXISTS preferred_language,
      DROP COLUMN IF EXISTS bar_council_state,
      DROP COLUMN IF EXISTS gstin;
  `);
};
