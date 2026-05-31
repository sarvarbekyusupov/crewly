-- AlterTable
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "hiring_manager_feedback_context" TEXT;

-- AlterTable
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "interview_debriefed_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "llm_calls" ADD COLUMN IF NOT EXISTS "agent_name" TEXT;
