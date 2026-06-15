-- AlterTable
ALTER TABLE "candidates" ADD COLUMN "linkedin_oauth_token" TEXT,
ADD COLUMN "linkedin_refresh_token" TEXT,
ADD COLUMN "linkedin_token_expires_at" TIMESTAMPTZ;
