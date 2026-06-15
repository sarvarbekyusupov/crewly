-- AddColumn: SeekerJobMatch notification tracking
ALTER TABLE "seeker_job_matches"
  ADD COLUMN IF NOT EXISTS "notified_via" TEXT,
  ADD COLUMN IF NOT EXISTS "notified_at" TIMESTAMPTZ;

-- CreateTable: TelegramChannel whitelist
CREATE TABLE IF NOT EXISTS "telegram_channels" (
  "id"           UUID         NOT NULL DEFAULT gen_random_uuid(),
  "channel_id"   BIGINT       NOT NULL,
  "channel_name" TEXT,
  "is_active"    BOOLEAN      NOT NULL DEFAULT true,
  "added_at"     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT "telegram_channels_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "telegram_channels_channel_id_key"
  ON "telegram_channels"("channel_id");

CREATE INDEX IF NOT EXISTS "idx_telegram_channels_active"
  ON "telegram_channels"("is_active");
