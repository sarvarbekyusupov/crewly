# Backend Plan — AI Recruiting Agency

**Stack:** NestJS + TypeScript + PostgreSQL 16 (pgvector) + Redis 7 + BullMQ + Prisma ORM
**Deployment target:** Railway/Render + managed Postgres + managed Redis (or single VPS with Docker Compose for cost)
**Audience:** Solo full-stack dev shipping an MVP that needs to be production-quality for first paying clients

---

## Table of contents

1. Design principles
2. Database schema (complete)
3. NestJS module structure
4. API endpoints
5. Background workers and queues
6. Authentication and multi-tenancy
7. External integrations
8. End-to-end data flows
9. Migrations and seeds
10. Configuration and secrets
11. Observability
12. Local dev setup
13. What to defer to v2

---

## 1. Design principles

These shape every decision below. Read once; apply throughout.

**1.1 Single source of truth in the DB.** No state in memory, no Redis-only data. Redis is for queues and caching only. If Postgres goes down, you should be able to rebuild Redis from scratch.

**1.2 Queue everything that touches an external API.** hh.ru, Anthropic, Telegram, email — all async via BullMQ. HTTP handlers return in <200ms.

**1.3 Log every LLM call.** Every Claude/OpenAI call gets a row in `llm_calls` with prompt, response, tokens, cost, latency. This is non-negotiable. You will need it for debugging, cost tracking, and prompt iteration.

**1.4 Tenant isolation at the data layer, not the application layer.** Every query that touches tenant-scoped data goes through a service that injects `company_id`. Use Prisma middleware so you can't forget.

**1.5 Prompts are code.** Versioned in a `packages/prompts` package with semantic versioning. Each prompt has a name and version. The DB records which prompt version produced which output.

**1.6 Consent and audit by default.** Personal data law in Uzbekistan is real. Every candidate read/write is logged. Every consent change is recorded.

**1.7 Idempotency on every external-facing endpoint.** Webhooks fire twice. Pages get refreshed. Plan for it.

**1.8 Soft deletes only.** Use `deleted_at` columns. Hard deletes lose information you'll wish you had.

---

## 2. Database schema (complete)

This is the full schema. Use Prisma to define it, but I'll show SQL because that's clearer for design discussion.

### 2.1 Core tenant entities

```sql
-- Companies are clients (IT companies hiring through us)
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  legal_name TEXT,
  tax_id TEXT,                           -- УзИНН for Uzbek entities
  website TEXT,
  industry TEXT,
  size TEXT,                             -- '1-10', '11-50', '51-200', '200+'
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'suspended', 'churned'
  pricing_tier TEXT NOT NULL DEFAULT 'standard', -- 'volume', 'standard', 'premium'
  default_fee_percentage NUMERIC(5,2) DEFAULT 12.00,
  payment_terms_days INT DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_companies_status ON companies(status) WHERE deleted_at IS NULL;

-- Users are humans at companies (hiring managers, admins)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  email TEXT NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  password_hash TEXT,                    -- nullable if SSO-only
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,                    -- 'owner', 'admin', 'hiring_manager', 'viewer'
  phone TEXT,
  telegram_username TEXT,
  locale TEXT NOT NULL DEFAULT 'ru',     -- 'ru', 'uz', 'en'
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(email) WHERE deleted_at IS NULL
);

CREATE INDEX idx_users_company ON users(company_id) WHERE deleted_at IS NULL;

-- Sessions for auth
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,       -- hash of session token
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- Internal users (you, future team members) live separately from client users
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,                    -- 'founder', 'recruiter', 'support'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.2 Jobs (role briefs)

```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  created_by_user_id UUID NOT NULL REFERENCES users(id),

  -- Basic
  title TEXT NOT NULL,                   -- "Senior Backend Engineer"
  description TEXT NOT NULL,             -- raw brief from client
  status TEXT NOT NULL DEFAULT 'draft',  -- 'draft','active','paused','filled','cancelled'
  priority TEXT DEFAULT 'normal',        -- 'low','normal','high','urgent'

  -- Parsed requirements (LLM-extracted)
  parsed_requirements JSONB,             -- structured: skills, experience, etc.
  required_skills TEXT[],                -- denormalized for indexing
  nice_to_have_skills TEXT[],
  min_experience_years INT,
  max_experience_years INT,

  -- Compensation
  salary_min_uzs BIGINT,                 -- in UZS som (no kopecks needed here)
  salary_max_uzs BIGINT,
  salary_currency TEXT DEFAULT 'UZS',    -- 'UZS','USD' if a foreign company prefers
  employment_type TEXT,                  -- 'full-time','part-time','contract'
  work_mode TEXT,                        -- 'office','hybrid','remote'
  office_location TEXT,                  -- if office/hybrid

  -- Fee
  fee_percentage NUMERIC(5,2) NOT NULL,
  fee_basis TEXT NOT NULL DEFAULT 'annual', -- 'annual','monthly'
  estimated_fee_uzs BIGINT,              -- computed: salary_max * 12 * fee_pct / 100

  -- Vector for matching
  embedding VECTOR(1536),                -- generated from parsed_requirements
  embedding_model TEXT,                  -- track which model generated it
  embedding_generated_at TIMESTAMPTZ,

  -- Lifecycle
  opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  filled_at TIMESTAMPTZ,
  target_candidates_count INT DEFAULT 5, -- how many to deliver

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_jobs_company ON jobs(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_jobs_status ON jobs(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_jobs_embedding ON jobs USING hnsw (embedding vector_cosine_ops);
```

### 2.3 Candidates

```sql
-- Where a candidate came from
CREATE TABLE candidate_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,             -- 'hh.ru', 'telegram_channel', 'referral', 'manual'
  config JSONB                           -- API keys, channel IDs, etc.
);

CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source tracking
  source_id UUID REFERENCES candidate_sources(id),
  external_id TEXT,                      -- hh.ru resume ID, telegram user ID
  source_url TEXT,                       -- back-link

  -- Identity
  full_name TEXT,
  full_name_normalized TEXT,             -- lowercased, trimmed (for dedup)
  email TEXT,
  phone TEXT,
  telegram_user_id BIGINT,               -- Telegram numeric ID
  telegram_username TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  city TEXT,
  country TEXT DEFAULT 'UZ',

  -- Professional snapshot
  current_position TEXT,
  current_company TEXT,
  years_experience NUMERIC(4,1),
  expected_salary_uzs BIGINT,
  expected_salary_currency TEXT DEFAULT 'UZS',
  notice_period_days INT,
  willing_to_relocate BOOLEAN,
  preferred_work_mode TEXT,

  -- Languages (array of {name, level})
  languages JSONB,

  -- Resume
  raw_resume_text TEXT,                  -- full text as scraped
  resume_file_url TEXT,                  -- if we have a PDF
  parsed_resume JSONB,                   -- LLM-extracted structured data
  skills TEXT[],                         -- denormalized from parsed_resume

  -- Vector
  embedding VECTOR(1536),
  embedding_model TEXT,
  embedding_generated_at TIMESTAMPTZ,

  -- Compliance
  consent_status TEXT NOT NULL DEFAULT 'implied', -- 'implied','explicit','withdrawn'
  consent_source TEXT,                   -- 'public_profile','telegram_optin','signup'
  consent_given_at TIMESTAMPTZ,
  consent_withdrawn_at TIMESTAMPTZ,
  do_not_contact BOOLEAN NOT NULL DEFAULT FALSE,

  -- Quality / state
  quality_score NUMERIC(4,2),            -- 0-100, learned over time
  last_active_at TIMESTAMPTZ,            -- last time we saw activity from them
  last_contacted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  UNIQUE(source_id, external_id) WHERE deleted_at IS NULL
);

CREATE INDEX idx_candidates_email ON candidates(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_candidates_telegram_id ON candidates(telegram_user_id) WHERE telegram_user_id IS NOT NULL;
CREATE INDEX idx_candidates_skills ON candidates USING gin(skills);
CREATE INDEX idx_candidates_embedding ON candidates USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_candidates_dnc ON candidates(do_not_contact) WHERE do_not_contact = TRUE;

-- Raw ingestion payloads (kept for re-parsing if prompts improve)
CREATE TABLE candidate_raw_payloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  source_id UUID REFERENCES candidate_sources(id),
  payload JSONB NOT NULL,                -- full hh.ru response, etc.
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_raw_payloads_candidate ON candidate_raw_payloads(candidate_id);
```

### 2.4 Applications (job × candidate matching)

```sql
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE RESTRICT,
  company_id UUID NOT NULL REFERENCES companies(id), -- denormalized for tenant queries

  -- Matching
  match_score NUMERIC(5,2),              -- 0-100 composite
  vector_similarity NUMERIC(6,5),        -- raw cosine similarity
  rerank_score NUMERIC(5,2),             -- after LLM re-rank
  match_reasons JSONB,                   -- {matched: [...], gaps: [...], notes: "..."}

  -- Pipeline state
  status TEXT NOT NULL DEFAULT 'matched',
  -- 'matched','queued_outreach','outreach_sent','responded','screening',
  -- 'screened_pass','screened_fail','delivered','interview_scheduled',
  -- 'interviewed','offered','hired','rejected_by_client','withdrew','no_response'

  -- Outcomes
  hiring_manager_decision TEXT,          -- 'approve','reject','maybe', null
  hiring_manager_notes TEXT,
  rejection_reason TEXT,                 -- structured + free text
  withdrawal_reason TEXT,

  -- Timestamps for each stage
  matched_at TIMESTAMPTZ DEFAULT NOW(),
  outreach_sent_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  screened_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  interviewed_at TIMESTAMPTZ,
  hired_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(job_id, candidate_id)
);

CREATE INDEX idx_applications_job_status ON applications(job_id, status);
CREATE INDEX idx_applications_candidate ON applications(candidate_id);
CREATE INDEX idx_applications_company ON applications(company_id);
CREATE INDEX idx_applications_status ON applications(status);
```

### 2.5 Outreach and conversations

```sql
-- Outreach campaigns (one per job, but could be more granular)
CREATE TABLE outreach_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  message_template TEXT NOT NULL,        -- with {{variables}}
  prompt_version TEXT NOT NULL,          -- which prompt version we used
  status TEXT NOT NULL DEFAULT 'active', -- 'active','paused','completed'
  total_sent INT DEFAULT 0,
  total_responded INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Conversations are threads (per candidate × campaign)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id),
  channel TEXT NOT NULL,                 -- 'telegram','email','sms'
  channel_thread_id TEXT,                -- Telegram chat ID, email thread ID
  state TEXT NOT NULL DEFAULT 'initiated',
  -- 'initiated','awaiting_response','in_progress','completed','abandoned'
  language TEXT NOT NULL DEFAULT 'ru',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_conversations_application ON conversations(application_id);
CREATE INDEX idx_conversations_state ON conversations(state);
CREATE INDEX idx_conversations_thread ON conversations(channel, channel_thread_id);

-- Individual messages in a conversation
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL,               -- 'outbound','inbound'
  sender TEXT NOT NULL,                  -- 'ai','candidate','staff'
  content TEXT NOT NULL,
  content_translated JSONB,              -- {ru: "...", en: "..."} optional
  channel_message_id TEXT,               -- Telegram message ID
  llm_call_id UUID REFERENCES llm_calls(id), -- if AI-generated
  delivered BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_channel_id ON messages(channel_message_id) WHERE channel_message_id IS NOT NULL;

-- Outreach attempts log (separate from messages — tracks delivery)
CREATE TABLE outreach_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  attempt_number INT NOT NULL,
  status TEXT NOT NULL,                  -- 'sent','delivered','failed','blocked'
  error_code TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_outreach_attempts_application ON outreach_attempts(application_id);
```

### 2.6 Screenings (the AI conversations that produce assessments)

```sql
CREATE TABLE screenings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id),

  -- Configuration
  prompt_version TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'ru',

  -- State
  status TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress','completed','abandoned','escalated'
  questions_asked INT DEFAULT 0,

  -- Outputs (filled when completed)
  ai_assessment JSONB,
  -- {
  --   technical_score: 0-10,
  --   experience_depth_score: 0-10,
  --   communication_score: 0-10,
  --   availability_score: 0-10,
  --   salary_fit_score: 0-10,
  --   overall_score: 0-10,
  --   strengths: ["..."],
  --   concerns: ["..."],
  --   recommendation: "advance|reject|maybe",
  --   summary: "2-paragraph narrative"
  -- }

  -- For debugging / re-running
  full_transcript JSONB,                 -- snapshot of all messages

  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  escalated_at TIMESTAMPTZ,              -- candidate asked for a human
  escalation_reason TEXT
);

CREATE INDEX idx_screenings_application ON screenings(application_id);
CREATE INDEX idx_screenings_status ON screenings(status);
```

### 2.7 Placements and billing

```sql
CREATE TABLE placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL UNIQUE REFERENCES applications(id),
  job_id UUID NOT NULL REFERENCES jobs(id),
  candidate_id UUID NOT NULL REFERENCES candidates(id),
  company_id UUID NOT NULL REFERENCES companies(id),

  -- Deal terms
  agreed_salary_uzs BIGINT NOT NULL,
  fee_percentage NUMERIC(5,2) NOT NULL,
  fee_basis TEXT NOT NULL,               -- 'annual','monthly'
  total_fee_uzs BIGINT NOT NULL,         -- computed
  start_date DATE NOT NULL,

  -- Guarantee
  guarantee_period_days INT DEFAULT 90,
  guarantee_expires_at DATE,
  candidate_still_employed BOOLEAN DEFAULT TRUE,
  separation_date DATE,
  replacement_required BOOLEAN DEFAULT FALSE,
  replacement_application_id UUID REFERENCES applications(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_placements_company ON placements(company_id);
CREATE INDEX idx_placements_guarantee ON placements(guarantee_expires_at) WHERE guarantee_expires_at IS NOT NULL;

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,   -- "INV-2026-0001"
  company_id UUID NOT NULL REFERENCES companies(id),
  placement_id UUID REFERENCES placements(id),
  amount_uzs BIGINT NOT NULL,
  vat_uzs BIGINT DEFAULT 0,
  total_uzs BIGINT NOT NULL,             -- amount + vat
  currency TEXT DEFAULT 'UZS',
  issued_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'issued', -- 'draft','issued','paid','overdue','cancelled'
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  pdf_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_company ON invoices(company_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date) WHERE status IN ('issued', 'overdue');
```

### 2.8 LLM observability

This table will be your most-queried in the first 3 months. Don't skimp.

```sql
CREATE TABLE llm_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context
  purpose TEXT NOT NULL,                 -- 'parse_resume','match_rerank','screening','dossier','parse_job'
  related_entity_type TEXT,              -- 'candidate','application','screening','job'
  related_entity_id UUID,
  company_id UUID,                       -- for cost attribution
  job_id UUID,

  -- Prompt
  prompt_name TEXT NOT NULL,             -- references packages/prompts
  prompt_version TEXT NOT NULL,
  model TEXT NOT NULL,                   -- 'claude-sonnet-4-5','claude-haiku-4-5','gpt-4o'
  provider TEXT NOT NULL,                -- 'anthropic','openai'
  temperature NUMERIC(3,2),
  max_tokens INT,

  -- Request/response
  request_payload JSONB,                 -- full messages array (for re-running)
  response_payload JSONB,                -- full API response
  output_text TEXT,                      -- extracted main content
  finish_reason TEXT,

  -- Cost / performance
  prompt_tokens INT,
  completion_tokens INT,
  total_tokens INT,
  cost_usd NUMERIC(10,6),
  latency_ms INT,

  -- Errors
  error TEXT,
  http_status INT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_llm_calls_purpose ON llm_calls(purpose, created_at DESC);
CREATE INDEX idx_llm_calls_entity ON llm_calls(related_entity_type, related_entity_id);
CREATE INDEX idx_llm_calls_company ON llm_calls(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX idx_llm_calls_created ON llm_calls(created_at DESC);
```

### 2.9 Ingestion runs (sourcing batch tracking)

```sql
CREATE TABLE ingestion_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES candidate_sources(id),
  trigger TEXT NOT NULL,                 -- 'scheduled','manual','job_specific'
  trigger_metadata JSONB,                -- e.g., {job_id: "...", filters: {...}}
  status TEXT NOT NULL DEFAULT 'running', -- 'running','completed','failed','partial'

  -- Stats
  candidates_fetched INT DEFAULT 0,
  candidates_new INT DEFAULT 0,
  candidates_updated INT DEFAULT 0,
  candidates_failed INT DEFAULT 0,

  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_ingestion_runs_source ON ingestion_runs(source_id, started_at DESC);
```

### 2.10 Compliance and audit

```sql
CREATE TABLE consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  action TEXT NOT NULL,                  -- 'given','withdrawn','updated'
  basis TEXT NOT NULL,                   -- 'public_profile','telegram_optin','email_optin','direct_signup'
  scope JSONB,                           -- {processing: true, storage: true, third_party: false}
  evidence_url TEXT,                     -- screenshot, audio recording, etc.
  ip_address INET,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consent_candidate ON consent_records(candidate_id, recorded_at DESC);

-- Audit log for any sensitive access (data law compliance)
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_type TEXT NOT NULL,              -- 'user','staff','system'
  actor_id UUID,
  action TEXT NOT NULL,                  -- 'candidate.view','candidate.export','candidate.delete'
  resource_type TEXT NOT NULL,
  resource_id UUID,
  company_id UUID,
  metadata JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_actor ON audit_log(actor_id, created_at DESC);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);
```

### 2.11 System tables

```sql
-- Idempotency keys for webhooks
CREATE TABLE idempotency_keys (
  key TEXT PRIMARY KEY,
  response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_idempotency_expires ON idempotency_keys(expires_at);

-- Feature flags
CREATE TABLE feature_flags (
  name TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  rollout_percentage INT DEFAULT 0,
  company_overrides JSONB,               -- {"<company_id>": true}
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.12 Required Postgres extensions

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

---

## 3. NestJS module structure

```
apps/api/src/
├── main.ts
├── app.module.ts
│
├── config/
│   ├── config.module.ts
│   ├── database.config.ts
│   ├── redis.config.ts
│   └── env.validation.ts
│
├── common/
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   ├── current-company.decorator.ts
│   │   └── public.decorator.ts
│   ├── guards/
│   │   ├── auth.guard.ts
│   │   ├── company-role.guard.ts
│   │   └── staff.guard.ts
│   ├── interceptors/
│   │   ├── audit.interceptor.ts
│   │   └── tenant-scope.interceptor.ts
│   ├── filters/
│   │   └── global-exception.filter.ts
│   └── pipes/
│       └── zod-validation.pipe.ts
│
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
│
├── modules/
│   ├── auth/
│   ├── staff-auth/
│   ├── companies/
│   ├── users/
│   ├── jobs/
│   ├── candidates/
│   ├── applications/
│   ├── screenings/
│   ├── conversations/
│   ├── placements/
│   ├── invoices/
│   ├── consent/
│   └── llm-calls/
│
├── integrations/
│   ├── llm/
│   │   ├── llm.module.ts
│   │   ├── anthropic.service.ts
│   │   ├── openai.service.ts
│   │   ├── prompt-runner.service.ts
│   │   └── cost-calculator.service.ts
│   ├── hh/
│   │   ├── hh.module.ts
│   │   ├── hh-client.service.ts
│   │   ├── hh-ingest.service.ts
│   │   └── hh.types.ts
│   ├── telegram/
│   │   ├── telegram.module.ts
│   │   ├── telegram-bot.service.ts
│   │   ├── telegram-webhook.controller.ts
│   │   └── telegram-rate-limiter.service.ts
│   ├── email/
│   │   └── email.service.ts
│   └── storage/
│       └── storage.service.ts
│
├── workers/
│   ├── workers.module.ts
│   ├── queue-names.ts
│   ├── ingest-candidates.processor.ts
│   ├── parse-candidate.processor.ts
│   ├── embed-candidate.processor.ts
│   ├── parse-job.processor.ts
│   ├── match-candidates.processor.ts
│   ├── send-outreach.processor.ts
│   ├── advance-screening.processor.ts
│   ├── generate-dossier.processor.ts
│   ├── send-notification.processor.ts
│   └── cleanup.processor.ts
│
├── pipelines/
│   ├── new-job.pipeline.ts
│   ├── screening.pipeline.ts
│   └── outreach.pipeline.ts
│
└── webhooks/
    └── webhooks.controller.ts
```

---

## 4. API endpoints

REST, JSON, versioned at `/api/v1/`. Session cookie auth (HttpOnly, Secure, SameSite=Lax).

### 4.1 Authentication
```
POST   /api/v1/auth/signup
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
POST   /api/v1/auth/verify-email
```

### 4.2 Companies
```
GET    /api/v1/companies/me
PATCH  /api/v1/companies/me
GET    /api/v1/companies/me/users
POST   /api/v1/companies/me/users
DELETE /api/v1/companies/me/users/:id
```

### 4.3 Jobs
```
GET    /api/v1/jobs
POST   /api/v1/jobs
GET    /api/v1/jobs/:id
PATCH  /api/v1/jobs/:id
POST   /api/v1/jobs/:id/activate
POST   /api/v1/jobs/:id/pause
POST   /api/v1/jobs/:id/close
DELETE /api/v1/jobs/:id
GET    /api/v1/jobs/:id/applications
GET    /api/v1/jobs/:id/stats
```

### 4.4 Candidates
```
GET    /api/v1/candidates
GET    /api/v1/candidates/:id
GET    /api/v1/candidates/:id/dossier.pdf
```

### 4.5 Applications
```
GET    /api/v1/applications
GET    /api/v1/applications/:id
PATCH  /api/v1/applications/:id
POST   /api/v1/applications/:id/approve
POST   /api/v1/applications/:id/reject
POST   /api/v1/applications/:id/hire
POST   /api/v1/applications/:id/notes
```

### 4.6 Webhooks
```
POST   /api/v1/webhooks/telegram
POST   /api/v1/webhooks/payment
```

### 4.7 Staff endpoints
```
GET    /api/v1/staff/dashboard
GET    /api/v1/staff/companies
GET    /api/v1/staff/llm-costs
POST   /api/v1/staff/ingestion-runs
GET    /api/v1/staff/candidates
POST   /api/v1/staff/candidates/:id/dnc
```

---

## 5. Background workers and queues

| Queue | Trigger | Concurrency | Retries |
|-------|---------|-------------|---------|
| `ingest-candidates` | Cron 4h / manual | 1 | 3 |
| `parse-candidate` | After ingest | 10 | 3 |
| `embed-candidate` | After parse | 20 | 5 |
| `parse-job` | On job create | 5 | 3 |
| `match-candidates` | After parse-job | 5 | 2 |
| `send-outreach` | After match | 1/sec Telegram | 3 |
| `advance-screening` | On candidate msg | 20 | 3 |
| `generate-dossier` | Screening complete | 10 | 3 |
| `send-notification` | Various | — | 3 |
| `cleanup` | Cron daily | 1 | — |

Mount Bull Board at `/admin/queues` behind staff auth.

---

## 6. Authentication and multi-tenancy

- Two auth realms: `users` (clients) and `staff` (internal). Separate guards, never mixed.
- Session-based (not JWT): easier revocation, simpler rotation. Cookie + sessions table.
- Tenant isolation via Prisma middleware using `AsyncLocalStorage` to inject `company_id`.
- Roles within company: `owner` > `admin` > `hiring_manager` > `viewer`.

---

## 7. External integrations

- **LLM**: All calls go through `PromptRunnerService`. Every call logged to `llm_calls`. Never call SDKs directly.
- **hh.ru**: Official API, employer account required. Area code `97` for Uzbekistan. Respect 429s with exponential backoff.
- **Telegram**: grammY library. Webhook in prod, long-poll in dev. Validate secret token header.
- **Email**: Resend or Postmark.
- **Storage**: S3-compatible for PDF dossiers.

---

## 8. End-to-end data flows

### 8.1 New job → matched candidates
1. `POST /api/v1/jobs` → creates job (draft) → queues `parse-job`
2. `parse-job` → Claude extracts requirements → generates embedding → queues `match-candidates`
3. `match-candidates` → vector similarity search → LLM re-rank → insert applications → queue `send-outreach`
4. `send-outreach` (rate limited) → Telegram message → update application status
5. Candidate replies → webhook → insert message → queue `advance-screening`
6. `advance-screening` → Claude asks questions or signals complete → queue `generate-dossier`
7. `generate-dossier` → Claude produces assessment → render dossier → notify hiring manager
8. Hiring manager approves/rejects via API
9. On hire → create placement + invoice

### 8.2 Candidate withdrawal
1. Detect withdrawal (LLM classifier or keyword)
2. Update application status → mark DNC if explicit unsubscribe
3. Insert consent_records withdrawal → send polite ack

### 8.3 Replacement (90-day guarantee)
1. `POST /api/v1/placements/:id/separation`
2. Update placement → if within guarantee: create replacement job → re-run match pipeline, skip invoice

---

## 9. Migrations and seeds

- Prisma Migrate for all schema changes
- Manual SQL additions in migration files for pgvector HNSW indexes (Prisma can't express these)
- Seed: candidate sources, feature flags, dev test company + admin user

---

## 10. Configuration and secrets

Validate all env vars with Zod at boot. Fail fast in production if anything missing.

Key vars: `DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET` (min 32 chars), `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `HH_EMPLOYER_TOKEN`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `RESEND_API_KEY`, `S3_*`, `SENTRY_DSN`.

---

## 11. Observability

- Structured JSON logging via Pino
- Sentry for error tracking
- `llm_calls` table is primary cost/debugging dashboard
- Bull Board for queue inspection
- Health check endpoint: `GET /health`

---

## 12. Local dev setup

```bash
# Prerequisites: Node 20+, Docker
docker compose up -d   # postgres + redis
pnpm install
pnpm prisma migrate dev
pnpm prisma db seed
pnpm dev               # starts NestJS with hot reload
```

Docker Compose services: `postgres:16` with `pgvector` extension, `redis:7-alpine`.

---

## 13. What to defer to v2

- SSO / OAuth (Google, LinkedIn)
- Multi-language resume parsing beyond ru/uz/en
- Candidate self-service portal
- Advanced analytics / BI dashboard
- Payment gateway integration (start with manual invoice + bank transfer)
- Multi-region / data residency
- Candidate quality score ML model (start with rule-based)
- hh.ru webhook subscriptions (start with polling)
- SMS channel (start with Telegram only)

---

## Implementation status

- [x] Project scaffold (NestJS, Prisma 5, BullMQ, docker-compose)
- [x] Prisma schema (all tables) + migration SQL with pgvector HNSW indexes
- [x] Auth module (signup, login, logout, session cookies, guards)
- [x] Companies module (GET/PATCH me, invite/remove users)
- [x] Jobs module + parse-job worker (LLM extraction + embedding)
- [x] Candidates module (client view) + ingest/parse/embed workers + hh.ru integration
- [x] Applications module + match-candidates worker (vector search + LLM rerank)
- [x] Screenings module + advance-screening worker (AI conversation state machine)
- [x] Conversations module (Telegram ↔ screening routing)
- [x] Outreach + send-outreach worker
- [x] Telegram bot integration (grammY, polling dev / webhook prod)
- [x] LLM integration (PromptRunnerService — logs every call to llm_calls)
- [x] Dossier generation worker
- [x] Placements module (list, get, separation/guarantee flow)
- [x] Invoices (auto-created on hire in ApplicationsService)
- [x] Staff endpoints (dashboard, companies, llm-costs, candidates, DNC, manual ingest)
- [x] Health check (GET /health)
- [x] Bull Board (/admin/queues)
- [x] Cron jobs (hh.ru every 4h, cleanup daily)
- [x] Email service (Resend)
- [ ] Storage service (S3 — PDF dossiers)
- [ ] Sentry error tracking wiring
