-- Partial unique indexes for candidate deduplication across sources
-- Nulls and soft-deleted records are excluded so they don't block new ingestion

CREATE UNIQUE INDEX IF NOT EXISTS "candidates_email_dedup"
  ON "candidates"("email")
  WHERE "email" IS NOT NULL AND "deleted_at" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "candidates_telegram_dedup"
  ON "candidates"("telegram_user_id")
  WHERE "telegram_user_id" IS NOT NULL AND "deleted_at" IS NULL;
