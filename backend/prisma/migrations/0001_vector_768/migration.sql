-- Switch vector dimensions from 1536 (OpenAI) to 768 (Gemini text-embedding-004)
--
-- Pattern for future vector column changes:
-- 1. DROP HNSW/IVFFlat indices first (ALTER COLUMN TYPE fails with active vector index)
-- 2. ALTER COLUMN TYPE to new dimension
-- 3. Recreate indices (build happens after type change)
-- 4. Re-enqueue embed-candidate jobs for all rows to regenerate vectors at new dimension
DROP INDEX IF EXISTS "idx_jobs_embedding";
DROP INDEX IF EXISTS "idx_candidates_embedding";

ALTER TABLE "jobs" ALTER COLUMN "embedding" TYPE VECTOR(768);
ALTER TABLE "candidates" ALTER COLUMN "embedding" TYPE VECTOR(768);

CREATE INDEX "idx_jobs_embedding" ON "jobs" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX "idx_candidates_embedding" ON "candidates" USING hnsw ("embedding" vector_cosine_ops);
