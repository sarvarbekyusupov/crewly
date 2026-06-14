-- Partial unique index: enforce uniqueness of external_id for HH-sourced candidates
-- (sourceId IS NULL = HH-created via hh-candidate.service.ts findOrCreate).
-- @@unique([sourceId, externalId]) in Prisma schema does NOT cover this case because
-- Postgres treats NULL != NULL, so concurrent creates with null sourceId bypass the
-- composite unique constraint and produce duplicate rows.
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "candidate_hh_external_id_unique"
  ON "candidates" ("external_id")
  WHERE "source_id" IS NULL;
