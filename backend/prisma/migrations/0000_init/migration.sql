-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "legal_name" TEXT,
    "tax_id" TEXT,
    "website" TEXT,
    "industry" TEXT,
    "size" TEXT,
    "contact_email" TEXT NOT NULL,
    "contact_phone" TEXT,
    "address" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "pricing_tier" TEXT NOT NULL DEFAULT 'standard',
    "default_fee_percentage" DECIMAL(5,2) NOT NULL DEFAULT 12.00,
    "payment_terms_days" INTEGER NOT NULL DEFAULT 30,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_companies_status" ON "companies"("status") WHERE "deleted_at" IS NULL;

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "password_hash" TEXT,
    "full_name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT,
    "telegram_username" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'ru',
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_users_company" ON "users"("company_id") WHERE "deleted_at" IS NULL;

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");
CREATE INDEX "idx_sessions_token_hash" ON "sessions"("token_hash");
CREATE INDEX "idx_sessions_expires" ON "sessions"("expires_at");

-- CreateTable
CREATE TABLE "staff" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "staff_email_key" ON "staff"("email");

-- CreateTable
CREATE TABLE "staff_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "staff_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "staff_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "staff_sessions_token_hash_key" ON "staff_sessions"("token_hash");
CREATE INDEX "idx_staff_sessions_token_hash" ON "staff_sessions"("token_hash");

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "priority" TEXT DEFAULT 'normal',
    "parsed_requirements" JSONB,
    "required_skills" TEXT[] NOT NULL DEFAULT '{}',
    "nice_to_have_skills" TEXT[] NOT NULL DEFAULT '{}',
    "min_experience_years" INTEGER,
    "max_experience_years" INTEGER,
    "salary_min_uzs" BIGINT,
    "salary_max_uzs" BIGINT,
    "salary_currency" TEXT DEFAULT 'UZS',
    "employment_type" TEXT,
    "work_mode" TEXT,
    "office_location" TEXT,
    "fee_percentage" DECIMAL(5,2) NOT NULL,
    "fee_basis" TEXT NOT NULL DEFAULT 'annual',
    "estimated_fee_uzs" BIGINT,
    "embedding" VECTOR(1536),
    "embedding_model" TEXT,
    "embedding_generated_at" TIMESTAMPTZ,
    "opened_at" TIMESTAMPTZ,
    "closed_at" TIMESTAMPTZ,
    "filled_at" TIMESTAMPTZ,
    "target_candidates_count" INTEGER NOT NULL DEFAULT 5,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_jobs_company" ON "jobs"("company_id") WHERE "deleted_at" IS NULL;
CREATE INDEX "idx_jobs_status" ON "jobs"("status") WHERE "deleted_at" IS NULL;
CREATE INDEX "idx_jobs_embedding" ON "jobs" USING hnsw ("embedding" vector_cosine_ops);

-- CreateTable
CREATE TABLE "candidate_sources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "config" JSONB,
    CONSTRAINT "candidate_sources_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "candidate_sources_name_key" ON "candidate_sources"("name");

-- CreateTable
CREATE TABLE "candidates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_id" UUID,
    "external_id" TEXT,
    "source_url" TEXT,
    "full_name" TEXT,
    "full_name_normalized" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "telegram_user_id" BIGINT,
    "telegram_username" TEXT,
    "linkedin_url" TEXT,
    "github_url" TEXT,
    "city" TEXT,
    "country" TEXT DEFAULT 'UZ',
    "current_position" TEXT,
    "current_company" TEXT,
    "years_experience" DECIMAL(4,1),
    "expected_salary_uzs" BIGINT,
    "expected_salary_currency" TEXT DEFAULT 'UZS',
    "notice_period_days" INTEGER,
    "willing_to_relocate" BOOLEAN,
    "preferred_work_mode" TEXT,
    "languages" JSONB,
    "raw_resume_text" TEXT,
    "resume_file_url" TEXT,
    "parsed_resume" JSONB,
    "skills" TEXT[] NOT NULL DEFAULT '{}',
    "embedding" VECTOR(1536),
    "embedding_model" TEXT,
    "embedding_generated_at" TIMESTAMPTZ,
    "consent_status" TEXT NOT NULL DEFAULT 'implied',
    "consent_source" TEXT,
    "consent_given_at" TIMESTAMPTZ,
    "consent_withdrawn_at" TIMESTAMPTZ,
    "do_not_contact" BOOLEAN NOT NULL DEFAULT false,
    "quality_score" DECIMAL(4,2),
    "last_active_at" TIMESTAMPTZ,
    "last_contacted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deleted_at" TIMESTAMPTZ,
    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "candidates_source_external" ON "candidates"("source_id", "external_id") WHERE "deleted_at" IS NULL;
CREATE INDEX "idx_candidates_email" ON "candidates"("email") WHERE "deleted_at" IS NULL;
CREATE INDEX "idx_candidates_telegram_id" ON "candidates"("telegram_user_id") WHERE "telegram_user_id" IS NOT NULL;
CREATE INDEX "idx_candidates_skills" ON "candidates" USING gin("skills");
CREATE INDEX "idx_candidates_embedding" ON "candidates" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX "idx_candidates_dnc" ON "candidates"("do_not_contact") WHERE "do_not_contact" = true;

-- CreateTable
CREATE TABLE "candidate_raw_payloads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "source_id" UUID,
    "payload" JSONB NOT NULL,
    "fetched_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "candidate_raw_payloads_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_raw_payloads_candidate" ON "candidate_raw_payloads"("candidate_id");

-- CreateTable
CREATE TABLE "llm_calls" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "purpose" TEXT NOT NULL,
    "related_entity_type" TEXT,
    "related_entity_id" UUID,
    "company_id" UUID,
    "job_id" UUID,
    "prompt_name" TEXT NOT NULL,
    "prompt_version" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "temperature" DECIMAL(3,2),
    "max_tokens" INTEGER,
    "request_payload" JSONB,
    "response_payload" JSONB,
    "output_text" TEXT,
    "finish_reason" TEXT,
    "prompt_tokens" INTEGER,
    "completion_tokens" INTEGER,
    "total_tokens" INTEGER,
    "cost_usd" DECIMAL(10,6),
    "latency_ms" INTEGER,
    "error" TEXT,
    "http_status" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "llm_calls_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_llm_calls_purpose" ON "llm_calls"("purpose", "created_at" DESC);
CREATE INDEX "idx_llm_calls_entity" ON "llm_calls"("related_entity_type", "related_entity_id");
CREATE INDEX "idx_llm_calls_company" ON "llm_calls"("company_id") WHERE "company_id" IS NOT NULL;
CREATE INDEX "idx_llm_calls_created" ON "llm_calls"("created_at" DESC);

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "match_score" DECIMAL(5,2),
    "vector_similarity" DECIMAL(6,5),
    "rerank_score" DECIMAL(5,2),
    "match_reasons" JSONB,
    "status" TEXT NOT NULL DEFAULT 'matched',
    "hiring_manager_decision" TEXT,
    "hiring_manager_notes" TEXT,
    "rejection_reason" TEXT,
    "withdrawal_reason" TEXT,
    "matched_at" TIMESTAMPTZ DEFAULT NOW(),
    "outreach_sent_at" TIMESTAMPTZ,
    "responded_at" TIMESTAMPTZ,
    "screened_at" TIMESTAMPTZ,
    "delivered_at" TIMESTAMPTZ,
    "interviewed_at" TIMESTAMPTZ,
    "hired_at" TIMESTAMPTZ,
    "rejected_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "applications_job_candidate" ON "applications"("job_id", "candidate_id");
CREATE INDEX "idx_applications_job_status" ON "applications"("job_id", "status");
CREATE INDEX "idx_applications_candidate" ON "applications"("candidate_id");
CREATE INDEX "idx_applications_company" ON "applications"("company_id");
CREATE INDEX "idx_applications_status" ON "applications"("status");

-- CreateTable
CREATE TABLE "outreach_campaigns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_id" UUID NOT NULL,
    "message_template" TEXT NOT NULL,
    "prompt_version" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "total_sent" INTEGER NOT NULL DEFAULT 0,
    "total_responded" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "completed_at" TIMESTAMPTZ,
    CONSTRAINT "outreach_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "channel" TEXT NOT NULL,
    "channel_thread_id" TEXT,
    "state" TEXT NOT NULL DEFAULT 'initiated',
    "language" TEXT NOT NULL DEFAULT 'ru',
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "last_message_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_conversations_application" ON "conversations"("application_id");
CREATE INDEX "idx_conversations_state" ON "conversations"("state");
CREATE INDEX "idx_conversations_thread" ON "conversations"("channel", "channel_thread_id");

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversation_id" UUID NOT NULL,
    "direction" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "content_translated" JSONB,
    "channel_message_id" TEXT,
    "llm_call_id" UUID,
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_messages_conversation" ON "messages"("conversation_id", "created_at");
CREATE INDEX "idx_messages_channel_id" ON "messages"("channel_message_id") WHERE "channel_message_id" IS NOT NULL;

-- CreateTable
CREATE TABLE "outreach_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "channel" TEXT NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "error_code" TEXT,
    "error_message" TEXT,
    "sent_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "outreach_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_outreach_attempts_application" ON "outreach_attempts"("application_id");

-- CreateTable
CREATE TABLE "screenings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "conversation_id" UUID,
    "prompt_version" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'ru',
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "questions_asked" INTEGER NOT NULL DEFAULT 0,
    "ai_assessment" JSONB,
    "full_transcript" JSONB,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "completed_at" TIMESTAMPTZ,
    "escalated_at" TIMESTAMPTZ,
    "escalation_reason" TEXT,
    CONSTRAINT "screenings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_screenings_application" ON "screenings"("application_id");
CREATE INDEX "idx_screenings_status" ON "screenings"("status");

-- CreateTable
CREATE TABLE "placements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "application_id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "agreed_salary_uzs" BIGINT NOT NULL,
    "fee_percentage" DECIMAL(5,2) NOT NULL,
    "fee_basis" TEXT NOT NULL,
    "total_fee_uzs" BIGINT NOT NULL,
    "start_date" DATE NOT NULL,
    "guarantee_period_days" INTEGER NOT NULL DEFAULT 90,
    "guarantee_expires_at" DATE,
    "candidate_still_employed" BOOLEAN NOT NULL DEFAULT true,
    "separation_date" DATE,
    "replacement_required" BOOLEAN NOT NULL DEFAULT false,
    "replacement_application_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "placements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "placements_application_id_key" ON "placements"("application_id");
CREATE INDEX "idx_placements_company" ON "placements"("company_id");
CREATE INDEX "idx_placements_guarantee" ON "placements"("guarantee_expires_at") WHERE "guarantee_expires_at" IS NOT NULL;

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_number" TEXT NOT NULL,
    "company_id" UUID NOT NULL,
    "placement_id" UUID,
    "amount_uzs" BIGINT NOT NULL,
    "vat_uzs" BIGINT NOT NULL DEFAULT 0,
    "total_uzs" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "issued_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'issued',
    "paid_at" TIMESTAMPTZ,
    "payment_reference" TEXT,
    "pdf_url" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");
CREATE INDEX "idx_invoices_company" ON "invoices"("company_id");
CREATE INDEX "idx_invoices_status" ON "invoices"("status");
CREATE INDEX "idx_invoices_due_date" ON "invoices"("due_date") WHERE "status" IN ('issued', 'overdue');

-- CreateTable
CREATE TABLE "ingestion_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_id" UUID NOT NULL,
    "trigger" TEXT NOT NULL,
    "trigger_metadata" JSONB,
    "status" TEXT NOT NULL DEFAULT 'running',
    "candidates_fetched" INTEGER NOT NULL DEFAULT 0,
    "candidates_new" INTEGER NOT NULL DEFAULT 0,
    "candidates_updated" INTEGER NOT NULL DEFAULT 0,
    "candidates_failed" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "completed_at" TIMESTAMPTZ,
    CONSTRAINT "ingestion_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_ingestion_runs_source" ON "ingestion_runs"("source_id", "started_at" DESC);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "candidate_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "basis" TEXT NOT NULL,
    "scope" JSONB,
    "evidence_url" TEXT,
    "ip_address" TEXT,
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_consent_candidate" ON "consent_records"("candidate_id", "recorded_at" DESC);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" BIGSERIAL NOT NULL,
    "actor_type" TEXT NOT NULL,
    "actor_id" UUID,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" UUID,
    "company_id" UUID,
    "metadata" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_audit_log_actor" ON "audit_log"("actor_id", "created_at" DESC);
CREATE INDEX "idx_audit_log_resource" ON "audit_log"("resource_type", "resource_id");
CREATE INDEX "idx_audit_log_created" ON "audit_log"("created_at" DESC);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "key" TEXT NOT NULL,
    "response" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "expires_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "idx_idempotency_expires" ON "idempotency_keys"("expires_at");

-- CreateTable
CREATE TABLE "feature_flags" (
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "rollout_percentage" INTEGER NOT NULL DEFAULT 0,
    "company_overrides" JSONB,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("name")
);

-- AddForeignKey constraints
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "staff_sessions" ADD CONSTRAINT "staff_sessions_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "candidate_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "candidate_raw_payloads" ADD CONSTRAINT "crp_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "candidate_raw_payloads" ADD CONSTRAINT "crp_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "candidate_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "applications" ADD CONSTRAINT "applications_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "applications" ADD CONSTRAINT "applications_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "outreach_campaigns" ADD CONSTRAINT "oc_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conv_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conv_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "msg_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "msg_llm_call_id_fkey" FOREIGN KEY ("llm_call_id") REFERENCES "llm_calls"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "outreach_attempts" ADD CONSTRAINT "oa_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "screenings" ADD CONSTRAINT "scr_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "screenings" ADD CONSTRAINT "scr_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "placements" ADD CONSTRAINT "pl_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "placements" ADD CONSTRAINT "pl_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "placements" ADD CONSTRAINT "pl_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "placements" ADD CONSTRAINT "pl_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "inv_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "inv_placement_id_fkey" FOREIGN KEY ("placement_id") REFERENCES "placements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ingestion_runs" ADD CONSTRAINT "ir_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "candidate_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consent_records" ADD CONSTRAINT "cr_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "llm_calls" ADD CONSTRAINT "lc_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "llm_calls" ADD CONSTRAINT "lc_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
