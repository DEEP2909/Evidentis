/* eslint-disable camelcase */
/**
 * Upgrade vector dimensions from 768 (LaBSE) to 1024 (BAAI/bge-m3).
 * Existing embeddings are nulled so they can be regenerated safely.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_document_chunks_embedding;
    DROP INDEX IF EXISTS idx_bare_act_sections_embedding;
    DROP INDEX IF EXISTS idx_case_citations_embedding;

    UPDATE document_chunks SET embedding = NULL WHERE embedding IS NOT NULL;
    UPDATE bare_act_sections SET embedding = NULL WHERE embedding IS NOT NULL;
    UPDATE case_citations SET embedding = NULL WHERE embedding IS NOT NULL;

    ALTER TABLE document_chunks
      ALTER COLUMN embedding TYPE vector(1024),
      ALTER COLUMN model_version SET DEFAULT 'BAAI/bge-m3';

    ALTER TABLE bare_act_sections
      ALTER COLUMN embedding TYPE vector(1024);

    ALTER TABLE case_citations
      ALTER COLUMN embedding TYPE vector(1024);

    CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
      ON document_chunks
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64);

    CREATE INDEX IF NOT EXISTS idx_bare_act_sections_embedding
      ON bare_act_sections
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64);

    CREATE INDEX IF NOT EXISTS idx_case_citations_embedding
      ON case_citations
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_document_chunks_embedding;
    DROP INDEX IF EXISTS idx_bare_act_sections_embedding;
    DROP INDEX IF EXISTS idx_case_citations_embedding;

    UPDATE document_chunks SET embedding = NULL WHERE embedding IS NOT NULL;
    UPDATE bare_act_sections SET embedding = NULL WHERE embedding IS NOT NULL;
    UPDATE case_citations SET embedding = NULL WHERE embedding IS NOT NULL;

    ALTER TABLE document_chunks
      ALTER COLUMN embedding TYPE vector(768),
      ALTER COLUMN model_version SET DEFAULT 'sentence-transformers/LaBSE';

    ALTER TABLE bare_act_sections
      ALTER COLUMN embedding TYPE vector(768);

    ALTER TABLE case_citations
      ALTER COLUMN embedding TYPE vector(768);

    CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
      ON document_chunks
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64);

    CREATE INDEX IF NOT EXISTS idx_bare_act_sections_embedding
      ON bare_act_sections
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64);

    CREATE INDEX IF NOT EXISTS idx_case_citations_embedding
      ON case_citations
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64);
  `);
};
