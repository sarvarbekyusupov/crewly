-- Add configurable guarantee period to companies (default 90 days)
ALTER TABLE "companies"
  ADD COLUMN "guarantee_period_days" INTEGER NOT NULL DEFAULT 90;
