-- Add auth columns missing from initial migrations
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "google_id" TEXT UNIQUE;
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "email_verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "last_login_at" TIMESTAMPTZ;
ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "password_hash" TEXT;

CREATE INDEX IF NOT EXISTS "idx_candidates_google_id" ON "candidates"("google_id") WHERE "google_id" IS NOT NULL;

-- Candidate sessions for auth token tracking
CREATE TABLE IF NOT EXISTS "candidate_sessions" (
  "id"           UUID        NOT NULL DEFAULT gen_random_uuid(),
  "candidate_id" UUID        NOT NULL,
  "token_hash"   TEXT        NOT NULL,
  "ip_address"   TEXT,
  "user_agent"   TEXT,
  "expires_at"   TIMESTAMPTZ NOT NULL,
  "revoked_at"   TIMESTAMPTZ,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "candidate_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "candidate_sessions_token_hash_key" UNIQUE ("token_hash"),
  CONSTRAINT "candidate_sessions_candidate_id_fkey" FOREIGN KEY ("candidate_id")
    REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_candidate_sessions_token_hash" ON "candidate_sessions"("token_hash");
CREATE INDEX IF NOT EXISTS "idx_candidate_sessions_candidate"   ON "candidate_sessions"("candidate_id");
CREATE INDEX IF NOT EXISTS "idx_candidate_sessions_expires"     ON "candidate_sessions"("expires_at");
