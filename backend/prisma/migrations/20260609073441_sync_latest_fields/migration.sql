/*
  Warnings:

  - You are about to drop the column `embedding` on the `candidates` table. All the data in the column will be lost.
  - You are about to drop the column `embedding` on the `jobs` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[source_id,external_id]` on the table `candidates` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "seeker_applications" DROP CONSTRAINT "seeker_applications_candidate_id_fkey";

-- DropForeignKey
ALTER TABLE "seeker_applications" DROP CONSTRAINT "seeker_applications_discovered_job_id_fkey";

-- DropForeignKey
ALTER TABLE "seeker_job_matches" DROP CONSTRAINT "seeker_job_matches_candidate_id_fkey";

-- DropForeignKey
ALTER TABLE "seeker_job_matches" DROP CONSTRAINT "seeker_job_matches_discovered_job_id_fkey";

-- DropIndex
DROP INDEX "idx_candidates_embedding";

-- DropIndex
DROP INDEX "idx_candidates_skills";

-- DropIndex
DROP INDEX "idx_jobs_embedding";

-- DropIndex
DROP INDEX "idx_sessions_token_hash";

-- DropIndex
DROP INDEX "idx_staff_sessions_token_hash";

-- DropIndex
DROP INDEX IF EXISTS "idx_candidates_email";

-- DropIndex
DROP INDEX IF EXISTS "idx_candidates_telegram_id";

-- DropIndex
DROP INDEX IF EXISTS "idx_candidates_dnc";

-- DropIndex
DROP INDEX IF EXISTS "idx_candidates_google_id";

-- DropIndex
DROP INDEX IF EXISTS "candidates_source_external";

-- DropIndex
DROP INDEX IF EXISTS "idx_companies_status";

-- DropIndex
DROP INDEX IF EXISTS "idx_invoices_due_date";

-- DropIndex
DROP INDEX IF EXISTS "idx_jobs_company";

-- DropIndex
DROP INDEX IF EXISTS "idx_jobs_status";

-- DropIndex
DROP INDEX IF EXISTS "idx_llm_calls_company";

-- DropIndex
DROP INDEX IF EXISTS "idx_messages_channel_id";

-- DropIndex
DROP INDEX IF EXISTS "idx_placements_guarantee";

-- DropIndex
DROP INDEX IF EXISTS "idx_users_company";

-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "shadow_analysis" JSONB,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "candidates" DROP COLUMN "embedding",
ADD COLUMN     "agent_settings" JSONB,
ADD COLUMN     "social_proof" JSONB,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "companies" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "discovered_jobs" ALTER COLUMN "skills" DROP DEFAULT,
ALTER COLUMN "raw_payload" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "feature_flags" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "invoices" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "jobs" DROP COLUMN "embedding",
ADD COLUMN     "sourcing_strategy" JSONB,
ALTER COLUMN "required_skills" DROP DEFAULT,
ALTER COLUMN "nice_to_have_skills" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "placements" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "seeker_applications" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "seeker_job_matches" ALTER COLUMN "strengths" DROP DEFAULT,
ALTER COLUMN "gaps" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "payme_transactions" (
    "id" TEXT NOT NULL,
    "invoice_id" UUID NOT NULL,
    "time" BIGINT NOT NULL,
    "amount" BIGINT NOT NULL,
    "state" INTEGER NOT NULL,
    "create_time" BIGINT NOT NULL,
    "perform_time" BIGINT NOT NULL DEFAULT 0,
    "cancel_time" BIGINT NOT NULL DEFAULT 0,
    "reason" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payme_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_payme_tx_invoice_state" ON "payme_transactions"("invoice_id", "state");

-- CreateIndex
CREATE INDEX "idx_candidates_email" ON "candidates"("email");

-- CreateIndex
CREATE INDEX "idx_candidates_telegram_id" ON "candidates"("telegram_user_id");

-- CreateIndex
CREATE INDEX "idx_candidates_dnc" ON "candidates"("do_not_contact");

-- CreateIndex
CREATE INDEX "idx_candidates_google_id" ON "candidates"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_source_id_external_id_key" ON "candidates"("source_id", "external_id");

-- CreateIndex
CREATE INDEX "idx_companies_status" ON "companies"("status");

-- CreateIndex
CREATE INDEX "idx_invoices_due_date" ON "invoices"("due_date");

-- CreateIndex
CREATE INDEX "idx_jobs_company" ON "jobs"("company_id");

-- CreateIndex
CREATE INDEX "idx_jobs_status" ON "jobs"("status");

-- CreateIndex
CREATE INDEX "idx_llm_calls_company" ON "llm_calls"("company_id");

-- CreateIndex
CREATE INDEX "idx_messages_channel_id" ON "messages"("channel_message_id");

-- CreateIndex
CREATE INDEX "idx_placements_guarantee" ON "placements"("guarantee_expires_at");

-- CreateIndex
CREATE INDEX "idx_screenings_conversation" ON "screenings"("conversation_id");

-- CreateIndex
CREATE INDEX "idx_users_company" ON "users"("company_id");

-- RenameForeignKey
ALTER TABLE "candidate_raw_payloads" RENAME CONSTRAINT "crp_candidate_id_fkey" TO "candidate_raw_payloads_candidate_id_fkey";

-- RenameForeignKey
ALTER TABLE "candidate_raw_payloads" RENAME CONSTRAINT "crp_source_id_fkey" TO "candidate_raw_payloads_source_id_fkey";

-- RenameForeignKey
ALTER TABLE "consent_records" RENAME CONSTRAINT "cr_candidate_id_fkey" TO "consent_records_candidate_id_fkey";

-- RenameForeignKey
ALTER TABLE "conversations" RENAME CONSTRAINT "conv_application_id_fkey" TO "conversations_application_id_fkey";

-- RenameForeignKey
ALTER TABLE "conversations" RENAME CONSTRAINT "conv_candidate_id_fkey" TO "conversations_candidate_id_fkey";

-- RenameForeignKey
ALTER TABLE "ingestion_runs" RENAME CONSTRAINT "ir_source_id_fkey" TO "ingestion_runs_source_id_fkey";

-- RenameForeignKey
ALTER TABLE "invoices" RENAME CONSTRAINT "inv_company_id_fkey" TO "invoices_company_id_fkey";

-- RenameForeignKey
ALTER TABLE "invoices" RENAME CONSTRAINT "inv_placement_id_fkey" TO "invoices_placement_id_fkey";

-- RenameForeignKey
ALTER TABLE "llm_calls" RENAME CONSTRAINT "lc_company_id_fkey" TO "llm_calls_company_id_fkey";

-- RenameForeignKey
ALTER TABLE "llm_calls" RENAME CONSTRAINT "lc_job_id_fkey" TO "llm_calls_job_id_fkey";

-- RenameForeignKey
ALTER TABLE "messages" RENAME CONSTRAINT "msg_conversation_id_fkey" TO "messages_conversation_id_fkey";

-- RenameForeignKey
ALTER TABLE "messages" RENAME CONSTRAINT "msg_llm_call_id_fkey" TO "messages_llm_call_id_fkey";

-- RenameForeignKey
ALTER TABLE "outreach_attempts" RENAME CONSTRAINT "oa_application_id_fkey" TO "outreach_attempts_application_id_fkey";

-- RenameForeignKey
ALTER TABLE "outreach_campaigns" RENAME CONSTRAINT "oc_job_id_fkey" TO "outreach_campaigns_job_id_fkey";

-- RenameForeignKey
ALTER TABLE "placements" RENAME CONSTRAINT "pl_application_id_fkey" TO "placements_application_id_fkey";

-- RenameForeignKey
ALTER TABLE "placements" RENAME CONSTRAINT "pl_candidate_id_fkey" TO "placements_candidate_id_fkey";

-- RenameForeignKey
ALTER TABLE "placements" RENAME CONSTRAINT "pl_company_id_fkey" TO "placements_company_id_fkey";

-- RenameForeignKey
ALTER TABLE "placements" RENAME CONSTRAINT "pl_job_id_fkey" TO "placements_job_id_fkey";

-- RenameForeignKey
ALTER TABLE "screenings" RENAME CONSTRAINT "scr_application_id_fkey" TO "screenings_application_id_fkey";

-- RenameForeignKey
ALTER TABLE "screenings" RENAME CONSTRAINT "scr_conversation_id_fkey" TO "screenings_conversation_id_fkey";

-- AddForeignKey
ALTER TABLE "payme_transactions" ADD CONSTRAINT "payme_transactions_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seeker_job_matches" ADD CONSTRAINT "seeker_job_matches_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seeker_job_matches" ADD CONSTRAINT "seeker_job_matches_discovered_job_id_fkey" FOREIGN KEY ("discovered_job_id") REFERENCES "discovered_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seeker_applications" ADD CONSTRAINT "seeker_applications_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seeker_applications" ADD CONSTRAINT "seeker_applications_discovered_job_id_fkey" FOREIGN KEY ("discovered_job_id") REFERENCES "discovered_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "applications_job_candidate" RENAME TO "applications_job_id_candidate_id_key";

-- RenameIndex
ALTER INDEX "idx_auth_tokens_hash" RENAME TO "auth_tokens_token_hash_key";

-- RenameIndex
ALTER INDEX "seeker_applications_candidate_job_key" RENAME TO "seeker_applications_candidate_id_discovered_job_id_key";

-- RenameIndex
ALTER INDEX "seeker_job_matches_candidate_job_key" RENAME TO "seeker_job_matches_candidate_id_discovered_job_id_key";
