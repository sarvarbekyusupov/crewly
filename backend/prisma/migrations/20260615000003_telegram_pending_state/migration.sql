-- AddColumn: Screening — store TG message ID for parse progress edits
ALTER TABLE "screenings"
  ADD COLUMN IF NOT EXISTS "telegram_status_message_id" TEXT;

-- CreateTable: TelegramPendingJob — replaces in-memory pendingJobApp Map
CREATE TABLE IF NOT EXISTS "telegram_pending_jobs" (
  "chat_id"    TEXT        NOT NULL,
  "job_id"     TEXT        NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "telegram_pending_jobs_pkey" PRIMARY KEY ("chat_id")
);
