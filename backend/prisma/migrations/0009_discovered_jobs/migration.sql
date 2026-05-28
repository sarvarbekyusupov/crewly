CREATE TABLE "discovered_jobs" (
  "id"              UUID        NOT NULL DEFAULT gen_random_uuid(),
  "source"          TEXT        NOT NULL,
  "external_id"     TEXT,
  "source_url"      TEXT        NOT NULL,
  "title"           TEXT        NOT NULL,
  "company"         TEXT        NOT NULL,
  "location"        TEXT,
  "description"     TEXT,
  "skills"          TEXT[]      NOT NULL DEFAULT '{}',
  "salary_min_uzs"  BIGINT,
  "salary_max_uzs"  BIGINT,
  "employment_type" TEXT,
  "work_mode"       TEXT,
  "status"          TEXT        NOT NULL DEFAULT 'active',
  "posted_at"       TIMESTAMPTZ,
  "raw_payload"     JSONB       NOT NULL DEFAULT '{}',
  "discovered_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "discovered_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "discovered_jobs_source_url_key" ON "discovered_jobs" ("source_url");
CREATE INDEX "idx_discovered_jobs_source"  ON "discovered_jobs" ("source", "discovered_at" DESC);
CREATE INDEX "idx_discovered_jobs_status"  ON "discovered_jobs" ("status");

CREATE TABLE "job_discovery_runs" (
  "id"           UUID        NOT NULL DEFAULT gen_random_uuid(),
  "source"       TEXT        NOT NULL,
  "trigger"      TEXT        NOT NULL,
  "query"        TEXT,
  "location"     TEXT,
  "status"       TEXT        NOT NULL DEFAULT 'running',
  "jobs_fetched" INT         NOT NULL DEFAULT 0,
  "jobs_new"     INT         NOT NULL DEFAULT 0,
  "jobs_updated" INT         NOT NULL DEFAULT 0,
  "error"        TEXT,
  "started_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "completed_at" TIMESTAMPTZ,
  CONSTRAINT "job_discovery_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_job_discovery_runs_source" ON "job_discovery_runs" ("source", "started_at" DESC);
