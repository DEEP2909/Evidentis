/* eslint-disable camelcase */
/**
 * EvidentIS HNSW Vector Index Migration
 * Migration: 20260417000022_hnsw-vector-index.js
 * 
 * Replaces IVFFlat index with HNSW for production use.
 * HNSW is maintenance-free and handles incremental inserts correctly,
 * unlike IVFFlat which requires periodic VACUUM ANALYZE and manual
 * lists retuning as data grows.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Drop the existing IVFFlat index
  pgm.sql(`DROP INDEX IF EXISTS idx_document_chunks_embedding;`);

  // Create HNSW index for fast cosine similarity search
  // m=16: number of connections per layer (default recommended)
  // ef_construction=64: size of the dynamic candidate list during construction
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding 
    ON document_chunks 
    USING hnsw (embedding vector_cosine_ops) 
    WITH (m = 16, ef_construction = 64);
  `);
};

exports.down = (pgm) => {
  // Revert to IVFFlat index
  pgm.sql(`DROP INDEX IF EXISTS idx_document_chunks_embedding;`);
  
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding 
    ON document_chunks 
    USING ivfflat (embedding vector_cosine_ops) 
    WITH (lists = 100);
  `);
};
