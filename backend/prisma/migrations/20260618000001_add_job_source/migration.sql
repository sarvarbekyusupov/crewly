-- AddColumn jobSource to jobs
ALTER TABLE "jobs" ADD COLUMN "job_source" TEXT NOT NULL DEFAULT 'hh';
