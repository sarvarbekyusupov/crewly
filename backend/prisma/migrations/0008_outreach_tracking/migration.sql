ALTER TABLE "outreach_attempts"
  ADD COLUMN "resend_email_id" TEXT,
  ADD COLUMN "opened_at"       TIMESTAMPTZ,
  ADD COLUMN "replied_at"      TIMESTAMPTZ;

CREATE INDEX "idx_outreach_attempts_resend_email_id"
  ON "outreach_attempts" ("resend_email_id");
