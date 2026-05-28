-- Auth tokens for password reset and email verification
CREATE TABLE "auth_tokens" (
  "id"         UUID        NOT NULL DEFAULT gen_random_uuid(),
  "user_id"    UUID        NOT NULL,
  "token_hash" TEXT        NOT NULL,
  "type"       TEXT        NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "used_at"    TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "auth_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "idx_auth_tokens_hash"      ON "auth_tokens"("token_hash");
CREATE INDEX        "idx_auth_tokens_user_type" ON "auth_tokens"("user_id", "type");

ALTER TABLE "auth_tokens"
  ADD CONSTRAINT "auth_tokens_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
