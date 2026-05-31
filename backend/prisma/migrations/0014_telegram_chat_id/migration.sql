-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegram_chat_id" TEXT;

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "revoked_at" TIMESTAMPTZ;
