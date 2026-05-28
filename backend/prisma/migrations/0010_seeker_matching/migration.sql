-- Seeker preferences on candidates
ALTER TABLE "candidates"
  ADD COLUMN IF NOT EXISTS "min_match_score"          INT,
  ADD COLUMN IF NOT EXISTS "blacklisted_companies"    TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "max_applications_per_day" INT    NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS "hh_oauth_token"           TEXT,
  ADD COLUMN IF NOT EXISTS "hh_resume_id"             TEXT;

-- AI match scores per (candidate, discovered_job)
CREATE TABLE "seeker_job_matches" (
  "id"               UUID        NOT NULL DEFAULT gen_random_uuid(),
  "candidate_id"     UUID        NOT NULL REFERENCES "candidates"("id") ON DELETE CASCADE,
  "discovered_job_id" UUID       NOT NULL REFERENCES "discovered_jobs"("id") ON DELETE CASCADE,
  "score"            INT         NOT NULL,
  "explanation"      TEXT,
  "strengths"        TEXT[]      NOT NULL DEFAULT '{}',
  "gaps"             TEXT[]      NOT NULL DEFAULT '{}',
  "scored_at"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "seeker_job_matches_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "seeker_job_matches_candidate_job_key"
  ON "seeker_job_matches" ("candidate_id", "discovered_job_id");
CREATE INDEX "idx_seeker_job_matches_candidate"
  ON "seeker_job_matches" ("candidate_id", "score" DESC);

-- Auto-apply tracking
CREATE TABLE "seeker_applications" (
  "id"                UUID        NOT NULL DEFAULT gen_random_uuid(),
  "candidate_id"      UUID        NOT NULL REFERENCES "candidates"("id") ON DELETE CASCADE,
  "discovered_job_id" UUID        NOT NULL REFERENCES "discovered_jobs"("id") ON DELETE CASCADE,
  "status"            TEXT        NOT NULL DEFAULT 'queued',
  "source"            TEXT        NOT NULL,
  "cover_letter"      TEXT,
  "hh_negotiation_id" TEXT,
  "error"             TEXT,
  "applied_at"        TIMESTAMPTZ,
  "created_at"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "seeker_applications_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "seeker_applications_candidate_job_key"
  ON "seeker_applications" ("candidate_id", "discovered_job_id");
CREATE INDEX "idx_seeker_applications_candidate" ON "seeker_applications" ("candidate_id");
CREATE INDEX "idx_seeker_applications_status"    ON "seeker_applications" ("status");
