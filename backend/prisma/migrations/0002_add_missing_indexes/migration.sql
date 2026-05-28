-- Add missing indexes for auth-critical and frequently-queried columns

CREATE INDEX IF NOT EXISTS "idx_sessions_user" ON "sessions"("user_id");
CREATE INDEX IF NOT EXISTS "idx_staff_sessions_staff" ON "staff_sessions"("staff_id");
CREATE INDEX IF NOT EXISTS "idx_jobs_created_by" ON "jobs"("created_by_user_id");
CREATE INDEX IF NOT EXISTS "idx_invoices_placement" ON "invoices"("placement_id");
