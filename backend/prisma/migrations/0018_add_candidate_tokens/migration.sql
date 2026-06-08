CREATE TABLE "candidate_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "candidate_tokens_token_hash_key" ON "candidate_tokens"("token_hash");
CREATE INDEX "idx_candidate_tokens_hash" ON "candidate_tokens"("token_hash");
CREATE INDEX "idx_candidate_tokens_candidate_type" ON "candidate_tokens"("candidate_id", "type");

ALTER TABLE "candidate_tokens" ADD CONSTRAINT "candidate_tokens_candidate_id_fkey"
  FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
