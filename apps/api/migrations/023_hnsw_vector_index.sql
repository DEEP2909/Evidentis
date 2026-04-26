-- EvidentIS: HNSW Vector Index for document_chunks
-- Without this index, vector similarity search degrades from O(log n) to O(n).
-- HNSW provides fast approximate nearest-neighbor search.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_document_chunks_embedding_hnsw
  ON document_chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

COMMENT ON INDEX idx_document_chunks_embedding_hnsw IS 'HNSW index for cosine similarity search on document embeddings';
