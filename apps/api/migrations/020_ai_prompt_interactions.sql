-- EvidentIS: AI Prompt Interactions (Context Agent)
-- Stores all AI interactions per user/matter for context retrieval and reporting.

CREATE TABLE IF NOT EXISTS ai_prompt_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  advocate_id UUID NOT NULL,
  matter_id UUID REFERENCES matters(id) ON DELETE SET NULL,

  -- Prompt data
  original_prompt TEXT NOT NULL,
  enhanced_prompt TEXT NOT NULL,
  prompt_category VARCHAR(50) NOT NULL DEFAULT 'general',
  prompt_tokens INT,

  -- Response data
  ai_response TEXT,
  response_tokens INT,
  response_quality_score REAL,
  response_has_citations BOOLEAN DEFAULT FALSE,

  -- Context used
  context_interaction_ids UUID[] DEFAULT '{}',
  context_document_ids UUID[] DEFAULT '{}',

  -- Metadata
  model_used VARCHAR(100),
  latency_ms INT,
  tags TEXT[] DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Per-user interaction history (most recent first)
CREATE INDEX IF NOT EXISTS idx_prompt_interactions_tenant_advocate
  ON ai_prompt_interactions(tenant_id, advocate_id, created_at DESC);

-- Per-matter interaction history
CREATE INDEX IF NOT EXISTS idx_prompt_interactions_matter
  ON ai_prompt_interactions(tenant_id, matter_id, created_at DESC)
  WHERE matter_id IS NOT NULL;

-- Category-based filtering
CREATE INDEX IF NOT EXISTS idx_prompt_interactions_category
  ON ai_prompt_interactions(tenant_id, prompt_category);

-- Full-text search on prompts and responses
CREATE INDEX IF NOT EXISTS idx_prompt_interactions_search
  ON ai_prompt_interactions USING gin(to_tsvector('english', original_prompt || ' ' || COALESCE(ai_response, '')));

COMMENT ON TABLE ai_prompt_interactions IS 'Stores all AI interactions for context retrieval, prompt enhancement, and analytics reporting. Scoped per tenant, user, and optionally per matter.';
