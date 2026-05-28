# Project Current State: my-hr

_Last updated: 2026-05-28_

## 1. Project Overview

**my-hr** is an AI-native recruiting platform that automates the full recruitment lifecycle using a "software-as-an-agency" model. It serves three audiences: Company users (hiring managers), Candidates (job seekers), and Staff (internal platform admins).

### Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Backend** | NestJS 11 (Node.js), TypeScript, Prisma 5 ORM |
| **Database** | PostgreSQL 16 with `pgvector` extension for semantic search |
| **Async Jobs** | BullMQ 4 + Redis 7 (13 background workers) |
| **Frontend** | Nuxt 3 (Vue 3, SPA mode), TypeScript, @nuxt/ui v3, Pinia |
| **Monorepo** | pnpm workspaces (`backend/`, `frontend/`, `packages/types/`) |
| **LLM Providers** | Anthropic (Claude), OpenAI (GPT-4o), Google (Gemini), Groq |
| **Integrations** | Telegram (grammY), hh.ru, LinkedIn, Resend (email), Google OAuth2, Google Calendar, AWS S3 |
| **Infra** | Docker Compose (dev + prod), nginx (SSL termination + reverse proxy), Jenkins CI/CD |
| **i18n** | English, Russian, Uzbek (`@nuxtjs/i18n`) — all 3 locales complete (486 keys each) |
| **Testing** | Jest (unit, 73 suites), Playwright (e2e) |

---

## 2. Monorepo Structure

```plaintext
my-hr/
├── backend/              # NestJS API, Prisma, BullMQ workers
├── frontend/             # Nuxt 3 SPA (company + candidate + staff portals)
├── packages/
│   └── types/            # Shared TypeScript types (@my-hr/types)
├── e2e/                  # Playwright end-to-end tests
├── nginx/                # nginx.conf — SSL, HTTP→HTTPS, /api proxy to backend
├── docker-compose.yml    # Local dev stack (postgres/pgvector, redis, backend, frontend)
├── docker-compose.prod.yml # Production stack with resource limits and health checks
├── Makefile              # Dev/prod/db helper commands
├── Jenkinsfile           # CI/CD pipeline (build Docker images, deploy)
└── design_handoff_my-hr/ # Design assets and documentation
```

---

## 3. Backend Implementation

### 3.1 NestJS Modules

#### Infrastructure

- `config/` — env validation (Zod, fail-fast)
- `prisma/` — Prisma client service
- `common/` — shared guards, decorators, pipes, filters, interceptors

#### Feature Modules

- `modules/auth/` — company user auth (JWT, session cookies, email verification, password reset)
- `modules/staff-auth/` — internal staff auth (separate session)
- `modules/candidate-auth/` — candidate auth (email/password + Google OAuth2, JWT)
- `modules/companies/` — company CRUD, user management, settings
- `modules/jobs/` — job posting CRUD, status lifecycle (draft → active → paused → closed)
- `modules/applications/` — hiring funnel lifecycle, bulk actions, dossier generation
- `modules/candidates/` — candidate database, resume upload, outreach history
- `modules/candidate-portal/` — candidate-facing API (profile, preferences, discovered jobs, seeker apps)
- `modules/screenings/` — AI screening orchestration (start, escalate)
- `modules/conversations/` — unified messaging (Telegram + web)
- `modules/placements/` — successful hire records, guarantee tracking, separation
- `modules/invoices/` — invoice CRUD, mark-paid
- `modules/llm-calls/` — LLM call log, cost summary by provider/purpose
- `modules/consent/` — GDPR consent audit
- `modules/events/` — SSE event streaming to frontend
- `modules/analytics/` — pipeline, timing, sourcing, outcomes, agent activity analytics
- `modules/dashboard/` — platform-wide KPI stats
- `modules/sourcing/` — LinkedIn candidate search (`GET /api/v1/sourcing/linkedin`, `POST /api/v1/sourcing/linkedin/ingest`)

#### Multi-Agent System (`modules/agents/`) — **ALL COMPLETE**

| Agent | Role | Status |
| :--- | :--- | :--- |
| `matchmaker.agent.ts` | Senior Talent Analyst — parse resumes/jobs, vector reranking | Complete |
| `screening.agent.ts` | AI Recruiter — dynamic multi-turn Telegram interviews | Complete |
| `sourcing.agent.ts` | Sourcing Specialist — hh.ru/LinkedIn queries + Tavily web search | Complete |
| `outreach.agent.ts` | Recruiting Copywriter — hyper-personalized outreach messages | Complete |
| `debrief.agent.ts` | Feedback Analyst — distills hiring manager notes into persistent Job Context | Complete |
| `coordinator.agent.ts` | Orchestrator — listens to pipeline events, books calendars, sends Telegram buttons | Complete |
| `seeker.agent.ts` | Career Pilot (candidate-side) — auto-applies to external jobs on seeker's behalf | Complete |

All agents inherit `BaseAgent` which stamps identity into every LLM call for cost attribution.

#### Integration Modules

- `integrations/llm/` — multi-provider prompt runner + cost calculator (Anthropic, OpenAI, Gemini, Groq)
- `integrations/email/` — Resend API service
- `integrations/storage/` — AWS S3 (resume PDFs, dossiers)
- `integrations/telegram/` — grammY bot service
- `integrations/hh/` — hh.ru API client + candidate adapter + jobs adapter
- `integrations/linkedin/` — LinkedIn adapter + jobs adapter
- `integrations/apply/` — cover letter generation, HH auto-apply service, LinkedIn auto-apply service
- `integrations/adapters/` — AdapterIngestService (unified candidate ingestion), JobDiscoveryService
- `integrations/google-calendar/` — Google Calendar API (interview scheduling → Meet link)

**Webhooks:** `webhooks/` — Telegram (bot updates), Resend (email delivery), Payment (signature-verified)

### 3.2 Prisma Models (29 total)

| Model | Purpose |
| :--- | :--- |
| `Company` | Recruitment company, billing settings |
| `User` | Company staff accounts (owner/admin/hiring_manager/viewer) |
| `Session` | User auth sessions |
| `AuthToken` | Email verification and password reset tokens |
| `Staff` | Internal platform staff |
| `StaffSession` | Staff auth sessions |
| `Job` | Job postings (requirements, salary, fee structure, embeddings) |
| `CandidateSource` | Source definitions (hh.ru, LinkedIn, etc.) |
| `Candidate` | Candidate profiles (contact, skills, experience, embeddings) |
| `CandidateSession` | Candidate portal sessions |
| `CandidateRawPayload` | Raw source data from external APIs |
| `Application` | Job applications, match scores, pipeline status, decisions |
| `OutreachCampaign` | Outreach message templates |
| `OutreachAttempt` | Per-candidate outreach delivery tracking (Resend) |
| `Conversation` | Messaging threads (Telegram, web) |
| `Message` | Individual messages in conversations |
| `Screening` | AI screening interview sessions |
| `Placement` | Successful hire records, fee, 90-day guarantee |
| `Invoice` | Billing invoices tied to placements |
| `LlmCall` | LLM API call logs (tokens, cost, provider, purpose) |
| `IngestionRun` | Candidate ingestion batch job logs |
| `ConsentRecord` | GDPR consent audit trail per candidate |
| `AuditLog` | System-wide activity audit log |
| `IdempotencyKey` | Webhook idempotency cache |
| `FeatureFlag` | Feature flag definitions |
| `SeekerJobMatch` | Scored matches between seekers and discovered external jobs |
| `SeekerApplication` | Seeker auto-applications to external jobs |
| `DiscoveredJob` | External jobs found for seekers (hh.ru, LinkedIn) |
| `JobDiscoveryRun` | Job discovery batch run logs |

### 3.3 BullMQ Workers (13 total)

| Worker | Trigger | Purpose |
| :--- | :--- | :--- |
| `ingest-candidates` | Scheduled | Poll hh.ru/LinkedIn for new candidates |
| `parse-candidate` | On ingest | LLM resume/profile extraction (Matchmaker Agent) |
| `embed-candidate` | After parse | Generate pgvector embeddings |
| `parse-job` | On job create/update | LLM job requirements extraction (Matchmaker Agent) |
| `match-candidates` | After job parse | Vector similarity + LLM reranking (Matchmaker Agent) |
| `send-outreach` | On match approve | Hyper-personalized outreach via Telegram/email (Outreach Agent) |
| `advance-screening` | On Telegram message | Dynamic AI screening conversations (Screening Agent) |
| `generate-dossier` | Post-screening | Produce comprehensive candidate assessment PDF |
| `discover-jobs` | Scheduled | Find external jobs for seeker candidates (Sourcing Agent) |
| `score-seeker-jobs` | After discovery | Score job relevance for each seeker (Matchmaker Agent) |
| `auto-apply` | On seeker match | Auto-apply to external jobs on seeker's behalf (Seeker Agent) |
| `sync-hh-status` | Scheduled | Sync application status back to hh.ru |
| `cleanup` | Scheduled | Maintenance (expire old data, purge queues) |

### 3.4 REST API Endpoints

**Auth** (`/api/v1/auth/`)
- `POST /signup`, `POST /login`, `POST /logout`, `POST /refresh`
- `GET /me`, `POST /forgot-password`, `POST /reset-password`
- `GET /verify-email`, `POST /resend-verification`

**Candidate Auth** (`/api/v1/candidate-auth/`)
- `POST /signup`, `POST /login`, `POST /logout`, `POST /refresh`, `GET /me`
- `GET /google` (initiate OAuth2), `GET /google/callback`

**Staff** (`/api/v1/staff/`)
- `POST /login`, `POST /logout`, `GET /me`, `GET /dashboard`
- `GET /companies`, `GET /candidates`, `POST /candidates/:id/dnc`
- `GET /llm-costs`, `GET /invoices`, `GET /consent`
- `POST /ingestion-runs`, `GET /ingestion-runs`
- `POST /job-discovery-runs`, `GET /job-discovery-runs`
- `GET /audit` — audit log with pagination

**Companies** (`/api/v1/companies/`)
- `GET /me`, `PATCH /me`
- `GET /me/users`, `POST /me/users`, `DELETE /me/users/:id`

**Jobs** (`/api/v1/jobs/`)
- `GET /`, `POST /`, `GET /:id`, `PATCH /:id`, `DELETE /:id`
- `POST /:id/activate`, `POST /:id/pause`, `POST /:id/close`
- `POST /:id/send-outreach`, `GET /:id/applications`, `GET /:id/stats`

**Applications** (`/api/v1/applications/`)
- `GET /`, `GET /:id`, `PATCH /:id`
- `POST /:id/approve`, `POST /:id/reject`, `POST /:id/hire`
- `POST /:id/mark-interviewed`, `POST /:id/make-offer`
- `POST /:id/schedule-interview` (creates Google Meet link)
- `GET /:id/dossier`, `POST /:id/retry-outreach`
- `POST /bulk-approve`, `POST /bulk-reject`

**Candidates** (`/api/v1/candidates/`)
- `GET /`, `GET /:id`, `POST /:id/resume`
- `GET /:id/outreach-history`

**Screenings** (`/api/v1/`)
- `GET /applications/:applicationId/screenings`
- `POST /applications/:applicationId/screenings`
- `GET /screenings/:id`, `POST /screenings/:id/escalate`

**Conversations** (`/api/v1/conversations/`)
- `GET /`, `GET /:id`, `POST /:id/messages`

**Placements** (`/api/v1/placements/`)
- `GET /`, `GET /:id`, `POST /:id/separation`

**Invoices** (`/api/v1/invoices/`)
- `GET /`, `GET /:id`, `PATCH /:id/paid`

**LLM Calls** (`/api/v1/llm-calls/`)
- `GET /`, `GET /summary`, `GET /:id`

**Candidate Portal** (`/api/v1/candidate-portal/`)
- `GET /profile`, `PATCH /profile`, `POST /cv`
- `GET /preferences`, `PATCH /preferences`
- `GET /applications`
- `GET /discovered-jobs`, `POST /discovered-jobs/score`
- `GET /seeker-applications`, `POST /seeker-applications`, `PATCH /seeker-applications/:id/status`

**Sourcing** (`/api/v1/sourcing/`)
- `GET /linkedin` — search LinkedIn candidates
- `POST /linkedin/ingest` — ingest found candidates

**Dashboard** — `GET /api/v1/dashboard/stats`

**Analytics** — `GET /api/v1/analytics/pipeline|timing|sourcing|outcomes|agents`

**Events (SSE)** — `GET /api/v1/events`

**Consent** — `GET /api/v1/candidates/:candidateId/consent`

**Webhooks** — `POST /api/v1/webhooks/telegram|payment|resend`

**Health** — `GET /health`

**Bull Board** — Password-protected queue monitoring UI

---

## 4. Frontend Implementation

### 4.1 Pages / Routes (44 total)

#### Public / Auth

- `/` — landing/home
- `/login` — HR staff login
- `/forgot-password`, `/reset-password`, `/verify-email` — password flow
- `/terms` — static terms of service
- `/staff/login` — staff login
- `/candidate/login` — candidate login

#### Company Portal (HR staff)

- `/dashboard` — KPI strip, Live Brain Feed (terminal-style agent thoughts), agent activity stream (SSE-driven)
- `/jobs` — job list (filter by status)
- `/jobs/create` — new job form
- `/jobs/[id]` — job detail + pipeline hub
- `/jobs/[id]/edit` — edit job
- `/applications` — application list (bulk approve/reject)
- `/applications/[id]` — application detail (dossier, transcript, Matchmaker Analysis report, hire flow, Google Meet scheduling)
- `/candidates` — candidate database
- `/candidates/[id]` — candidate profile
- `/conversations` — conversation list
- `/conversations/[id]` — conversation thread
- `/placements` — placements list
- `/placements/[id]` — placement detail
- `/invoices` — invoice list
- `/invoices/[id]` — invoice detail
- `/analytics` — funnel pipeline, timing metrics, sourcing breakdown, outcomes, agent activity (real data, no placeholder)
- `/settings` — company settings

#### Candidate Portal

- `/candidate/dashboard` — overview of matches and applications
- `/candidate/profile` — profile management
- `/candidate/preferences` — salary, location, blacklist preferences
- `/candidate/jobs` — AI-matched external job feed with scoring
- `/candidate/applications` — applications status view
- `/candidate/seeker-applications` — auto-applied jobs by the AI agent
- `/candidate/chat` — list of active screening conversations
- `/candidate/chat/[id]` — in-browser screening chat with AI (web channel alongside Telegram)

#### Staff Portal

- `/staff/dashboard` — platform-wide health
- `/staff/companies` — company management
- `/staff/candidates` — global candidate list + DNC controls
- `/staff/ingestion` — manual ingestion trigger + run history
- `/staff/llm-costs` — token/cost breakdown by provider
- `/staff/invoices` — platform-wide billing
- `/staff/audit` — audit log viewer with pagination
- `/staff/consent` — GDPR consent records viewer
- `/staff/sourcing` — LinkedIn candidate search + ingest UI

#### System

- `/error` — error page
- `/[...slug]` — 404 catch-all

### 4.2 Components (15 total)

| Component | Purpose |
| :--- | :--- |
| `ApplicationHiringStepper.vue` | Multi-step hiring workflow UI |
| `ApplicationKanban.vue` | Kanban board for pipeline |
| `ApplicationStatusBadge.vue` | Status badge |
| `BulkActionBar.vue` | Bulk approve/reject toolbar |
| `ConfirmModal.vue` | Generic confirm dialog |
| `EmptyState.vue` | Empty state placeholder |
| `ListSkeleton.vue` | Loading skeleton |
| `PageHead.vue` | Page title/header with slots |
| `dashboard/AgentActivityStream.vue` | Real-time SSE activity feed |
| `dashboard/CandidateRow.vue` | Candidate row renderer |
| `dashboard/KpiCard.vue` | Single KPI metric card |
| `dashboard/KpiStrip.vue` | Horizontal KPI row |
| `dashboard/LiveBrainFeed.vue` | Terminal-style real-time agent thought stream |
| `dashboard/PipelineOverview.vue` | Pipeline visualization |
| `job/JobPipelineHub.vue` | Job-specific pipeline hub |

### 4.3 Composables (7 total)

| Composable | Purpose |
| :--- | :--- |
| `useApi.ts` | HTTP client for HR staff (JWT + auto-refresh on 401) |
| `useApiBase.ts` | Shared `buildApiClient()` factory, `createTokenRefresher()` |
| `useCandidateApi.ts` | HTTP client for candidate portal (separate JWT) |
| `useEventStream.ts` | SSE connection to `/api/v1/events`; events: `new_matches`, `screening_complete`, `new_message`; state: `useSseConnectionState()`, `useSseEventCount()` |
| `useListQuery.ts` | Stable `useAsyncData` cache key builder |
| `useSparkline.ts` | Sparkline chart data generation |
| `useStatusLabels.ts` | i18n-aware label mapping for all status enums |

### 4.4 Pinia Stores (3)

| Store | State | Key Actions |
| :--- | :--- | :--- |
| `auth.ts` | `user`, `loading` | `fetchMe`, `login`, `logout`, `can(minRole)` |
| `candidate-auth.ts` | `candidate`, `loading` | `fetchMe`, `login`, `signup`, `logout`, `initiateGoogleLogin` |
| `staff.ts` | `staff`, `loading` | `fetchMe`, `login`, `logout`, `clear` |

### 4.5 Middleware (3)

- `auth.ts` — guards HR staff routes, redirects to `/login`
- `candidate-auth.ts` — guards `/candidate/*`, redirects to `/candidate/login`
- `staff-auth.ts` — guards `/staff/*`, redirects to `/staff/login`

### 4.6 Utilities

- `utils/applicationPipeline.ts` — pipeline state logic (has unit tests)
- `utils/formatters.ts` — `formatDate`, `formatSalary`, `extractApiErrorMessage` (has unit tests)
- `utils/statusColors.ts` — Tailwind color class mapping per status

### 4.7 Internationalization

3 locales fully complete: **English** (`en.json`), **Russian** (`ru.json`), **Uzbek** (`uz.json`) — 486 keys each, no gaps.
Keys cover: `common`, `candidates`, `jobs`, `applications`, `conversations`, `invoices`, `settings`, `events`.

### 4.8 Layouts

- `default.vue` — HR staff (sidebar + header)
- `candidate.vue` — candidate portal
- `staff.vue` — staff portal
- `empty.vue` — login/public pages

---

## 5. External Integrations Status

| Integration | Status | Purpose |
| :--- | :--- | :--- |
| **Anthropic (Claude)** | Active | Primary LLM for parsing, screening, dossiers |
| **OpenAI (GPT-4o)** | Active | Secondary LLM, fallback |
| **Google Gemini** | Active | Third LLM provider |
| **Groq** | Active | Fourth LLM provider (speed/cost tradeoff) |
| **Tavily** | Active | Web search for candidate GitHub/portfolio discovery (Sourcing Agent) |
| **Telegram** | Active | Webhook-based candidate screening conversations + hiring manager command center |
| **hh.ru** | Active | Bi-directional: ingest candidates, post jobs, sync status, auto-invite |
| **LinkedIn** | Active | Candidate sourcing, job discovery, auto-apply |
| **Google OAuth2** | Active | Candidate portal sign-in |
| **Google Calendar** | Active | Interview scheduling → Google Meet link generation |
| **Resend** | Active | Transactional email + delivery webhooks |
| **AWS S3** | Active | Resume PDFs, dossier document storage |
| **Redis** | Active | BullMQ job queue backend |
| **pgvector** | Active | Vector embeddings for semantic candidate-job matching |
| **Sentry** | Not wired | Error tracking (DSN in config, not integrated in code) |

---

## 6. Feature Status (Updated)

| Feature | Backend | Frontend | Status |
| :--- | :--- | :--- | :--- |
| **AI Screening (Telegram)** | Complete | Transcript + dossier view | Complete |
| **AI Screening (Web Chat)** | Complete (conversations API) | `/candidate/chat/[id]` | **Complete** |
| **LinkedIn Sourcing** | Complete (sourcing module) | `/staff/sourcing` | Complete — in Staff portal |
| **LinkedIn in Company Portal** | Via candidates list | Not yet | Gap — company users can't browse LinkedIn |
| **Google Calendar Scheduling** | Complete (Meet link) | Implemented in application detail | Complete |
| **Invoicing** | Complete (auto-generation) | Complete (management UI) | Complete — manual mark-paid only |
| **Payment Gateway** | Not implemented | Not implemented | **Gap** — bank transfer only |
| **Audit Log** | Complete (`AuditLog` table + endpoint) | `/staff/audit` | **Complete** |
| **Consent / GDPR** | Complete (`ConsentRecord`) | `/staff/consent` | **Complete** |
| **Analytics Charts** | Complete (5 endpoints) | `/analytics` — real data, UTable + progress bars | **Complete** |
| **Live Brain Feed** | SSE events | `LiveBrainFeed.vue` on dashboard | **Complete** |
| **Telegram Command Center** | Complete (inline keyboard) | N/A (Telegram UI) | **Complete** |
| **Autonomous HH.ru Invite** | Complete | N/A | **Complete** |
| **Debrief / Shadow Analysis** | Complete | Application detail | **Complete** |
| **i18n Completeness** | N/A | 486 keys × 3 locales | **Complete** |
| **Feature Flags** | DB model exists | Not implemented | Gap — no admin UI |
| **Ingestion Control** | Complete | `/staff/ingestion` | Complete — no real-time progress |
| **Bull Board** | Active (password-protected) | Backend URL | Already accessible |
| **Sentry** | Not wired | Not wired | **Gap** |
| **Mobile Optimization** | N/A | Desktop-first (1100px+) | **Gap** |

---

## 7. Known Code Issues (from May 26 review)

| File | Issue |
| :--- | :--- |
| `coordinator.agent.ts:10` | `GoogleCalendarService` injected but never called — dead dependency |
| `pipeline-coordinator.service.ts:183` | Interview hardcoded to 10:00–11:00 AM next day, no availability check |
| `pipeline-coordinator.service.ts:199` | `'agent-coordinator'` passed as `userId` — not a real user ID |
| `pipeline-coordinator.service.ts:37` | `data.split(':')` for Telegram callback is fragile (UUID safe, CUID/ULID not) |
| `debrief.agent.ts:116` | Inline JSON strip regex instead of shared `stripLlmJson` |
| `coordinator.agent.ts:66` | Same inline regex issue |
| `outreach.agent.ts:26,31` | `any \| null` redundant type annotation |
| `matchmaker.agent.ts:55` | `skills.slice(0, 5)` vs `slice(0, 8)` inconsistency with seeker scoring |
| `agent.types.ts:8-13` | `AgentResponse<T>` defined but never used — dead interface |
| `seeker.agent.ts:28` | `socialProof?: any` accepted but never interpolated into prompt |
| `agents.module.ts` | `forwardRef(() => ApplicationsModule)` signals circular dep — scheduling should be its own module |

---

## 8. Infrastructure

- **Docker Compose (dev):** postgres/pgvector + redis + backend + frontend; auto-migrate + seed on start
- **Docker Compose (prod):** same services + nginx; resource limits (CPU/memory), health checks, internal bridge network, pre-built images via `IMAGE_BACKEND`/`IMAGE_FRONTEND` env vars
- **nginx:** SSL termination, HTTP→HTTPS redirect, `/api` and `/webhooks` proxy to backend, everything else to frontend, security headers
- **Jenkins:** `Jenkinsfile` CI/CD pipeline — builds Docker images, deploys to production
- **Makefile:** `up/down/logs/clean` (dev), `build/pull/deploy` (prod), `migrate/seed` (db)
- **Playwright:** e2e tests in `e2e/` directory (auth + jobs)
- **Jest:** 73 test suites across backend (unit tests for all guards, interceptors, services, agents)
- **Bull Board:** password-protected queue monitoring UI (via `BULL_BOARD_PASSWORD`)
