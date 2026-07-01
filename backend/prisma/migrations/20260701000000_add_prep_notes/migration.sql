-- AddColumn prep_notes to seeker_applications
ALTER TABLE "seeker_applications" ADD COLUMN IF NOT EXISTS "prep_notes" TEXT;
