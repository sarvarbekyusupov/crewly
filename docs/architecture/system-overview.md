# System Overview

## What Crewly Is

Two products in one codebase:

1. **B2B Recruiting Platform** — HR companies post jobs, AI matches and screens candidates, automates outreach
2. **Candidate-First Job Marketplace** — Tashkent job seekers use Telegram bot to get matched with jobs, AI helps them get hired

Current focus: **candidate-first Tashkent launch via Telegram**.

---

## System Diagram

```
                        ┌─────────────────────────────────────────┐
                        │              Clients                     │
                        │                                          │
                  ┌─────┴──────┐  ┌──────────────┐  ┌───────────┐│
                  │ Telegram   │  │  Web Browser │  │  Telegram ││
                  │ Bot        │  │  (4 portals) │  │  Mini App ││
                  │ (grammY)   │  │              │  │  (/tma)   ││
                  └─────┬──────┘  └──────┬───────┘  └─────┬─────┘│
                        └───────────┬────┘                │       │
                                    │         HTTPS        │       │
                                    └──────────────────────┘       │
                                               │                    │
                                    ┌──────────▼──────────┐        │
                                    │       nginx          │        │
                                    │  SSL termination     │        │
                                    │  Rate limiting       │        │
                                    │  Static cache        │        │
                                    └──────┬──────┬────────┘        │
                                           │      │                  │
                               /api/* /webhooks/* │  /*              │
                                           │      │                  │
                              ┌────────────▼──┐  ┌▼────────────┐   │
                              │   NestJS API   │  │  Nuxt 4 SSR │   │
                              │   port 3000    │  │  port 3000  │   │
                              │                │  │             │   │
                              │  25 modules    │  │  4 portals  │   │
                              │  14 workers    │  │  74 pages   │   │
                              │  7 AI agents   │  │  8 stores   │   │
                              └───────┬────────┘  └─────────────┘   │
                                      │                               │
                   ┌──────────────────┼───────────────────────┐      │
                   │                  │                        │      │
         ┌─────────▼───────┐  ┌───────▼──────┐  ┌────────────▼──┐  │
         │   PostgreSQL 16  │  │   Redis 7    │  │  External APIs│  │
         │   + pgvector     │  │              │  │               │  │
         │                  │  │  BullMQ jobs │  │  HH.uz        │  │
         │  29 models       │  │  Sessions    │  │  LinkedIn     │  │
         │  Vector index    │  │  Cache       │  │  Anthropic    │  │
         │  HNSW            │  │              │  │  Telegram     │  │
         └──────────────────┘  └──────────────┘  └───────────────┘  │
                                                                      │
                                                    S3 / Resend /     │
                                                    Eskiz / Payme /   │
                                                    Google Calendar   │
```

---

## Four Portals

### 1. Employer Portal (`/employer`)
HR recruiters and hiring managers. Core B2B product.

- Post jobs, set requirements
- View AI-ranked candidate shortlists
- Run AI screening interviews
- Schedule interviews, make offers, track placements
- Publish jobs to HH.uz
- Manage HH.uz negotiations

### 2. Candidate Portal (`/candidate`)
Job seekers with web accounts. More powerful than Telegram bot.

- Build full profile (experience, education, skills, projects)
- Upload/parse CV with AI
- Browse scored job matches
- Link HH.uz and LinkedIn accounts
- Track application statuses
- Chat with recruiters

### 3. Staff Admin Portal (`/staff`)
Internal Crewly team. Operations and oversight.

- View all companies and candidates
- Trigger candidate ingestion runs
- Monitor LLM costs and usage
- View audit logs and GDPR consent
- Manage feature flags
- Manage invoices across companies

### 4. Telegram Mini App (`/tma`)
Lightweight version embedded in Telegram. Quick access for candidates and HR on mobile.

- Candidates: job feed, apply, view applications
- HR: pipeline overview, approve/reject candidates

---

## Key Design Decisions

### Why Telegram first?
Tashkent job seekers live in Telegram. Zero friction — no app download, no signup form. Bot reaches them where they already are.

### Why multi-tenant?
Crewly serves multiple recruiting agencies. Each company's data is isolated by `companyId`. One database, one backend, per-company access control.

### Why BullMQ?
LLM calls (Claude, Groq) take 2–30 seconds. Doing them synchronously in HTTP handlers would time out. Queue workers process them async, with retry on failure.

### Why pgvector?
Semantic candidate-job matching without a separate vector database (Pinecone, Weaviate). Keeps the stack simple — one PostgreSQL instance for both relational data and vector similarity search.

### Why cookie-based JWT?
- No `Authorization` header management in frontend
- httpOnly cookies immune to XSS (can't read from JavaScript)
- Separate secrets per role (`JWT_ACCESS_SECRET` vs `JWT_CANDIDATE_SECRET`) — HR token can't impersonate candidate

### Why hybrid SSR (Nuxt)?
- Public pages (`/`, `/jobs`, `/terms`) pre-rendered for SEO
- Protected routes (`/employer/**`, `/candidate/**`, `/staff/**`) rendered as SPA (no SSR) — no server secret exposure, faster navigation
- TMA routes (`/tma/**`) no SSR — Telegram WebApp SDK requires client-side JS

---

## Multi-Tenancy Model

```
Company (tenant)
  └── Users (HR staff) — scoped to Company
        └── Jobs — scoped to Company
              └── Applications — scoped to Company
                    ├── Screenings
                    ├── Conversations
                    └── Placements → Invoices
```

Every NestJS service method in HR modules receives `companyId` from `TenantInterceptor` (which reads it from the JWT). All Prisma queries include `where: { companyId }`.

Candidates are **global** — not scoped to a company. A candidate can have applications at multiple companies.

---

## Technology Versions

| Package | Version | Why |
|---------|---------|-----|
| `@nestjs/core` | 11 | Latest LTS, full ESM support |
| `nuxt` | 4 | Vue 3, Vite, file-based routing |
| `prisma` | 5 | pgvector support, relation mode |
| `@nestjs/bull` | 11 | BullMQ wrapper for NestJS |
| `grammy` | 1.43 | Modern Telegram bot framework |
| `@anthropic-ai/sdk` | 0.96 | Claude API |
| `zod` | 4 | Runtime validation (env vars, DTOs) |
| `argon2` | 0.44 | Password hashing (resistant to GPU attacks) |
