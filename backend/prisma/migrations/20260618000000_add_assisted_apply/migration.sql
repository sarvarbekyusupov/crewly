-- AddColumn applyMethod, applyUrl, applyKit to seeker_applications
ALTER TABLE "seeker_applications" ADD COLUMN "apply_method" TEXT NOT NULL DEFAULT 'assisted';
ALTER TABLE "seeker_applications" ADD COLUMN "apply_url" TEXT;
ALTER TABLE "seeker_applications" ADD COLUMN "apply_kit" JSONB;
