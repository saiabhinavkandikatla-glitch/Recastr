// Database index creation script for vector similarity search
-- This should be run after the main schema if you want to create the index later
-- or if you need to rebuild it

-- Drop index if exists (for rebuilding)
DROP INDEX IF EXISTS idx_embeddings_embedding;

-- Create IVFFlat index for cosine similarity search
-- Using 100 lists as a starting point (should be tuned based on data size)
CREATE INDEX IF NOT EXISTS idx_embeddings_embedding ON embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Alternative: HNSW index for better performance on larger datasets
-- CREATE INDEX IF NOT EXISTS idx_embeddings_embedding_hnsw ON embeddings
-- USING hnsw (embedding vector_cosine_ops)
-- WITH (m = 16, ef_construction = 64);

-- Note: For production, you may want to adjust the parameters based on:
-- - Dataset size (lists = rows / 1000 for IVFFlat, up to 10000)
-- - Recall vs speed requirements
-- - Available memory