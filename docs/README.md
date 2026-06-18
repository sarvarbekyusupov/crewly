# Crewly Documentation

Candidate-first job marketplace for Tashkent, built on Telegram + AI.

---

## Navigation

### Getting Started
| Doc | Description |
|-----|-------------|
| [Quickstart](getting-started/quickstart.md) | Run the app in 5 minutes |
| [Local Development](getting-started/local-dev.md) | Full dev environment setup |

### Architecture
| Doc | Description |
|-----|-------------|
| [System Overview](architecture/system-overview.md) | Stack, portals, system diagram |
| [Auth Flows](architecture/auth-flows.md) | 3 auth flows (HR, Candidate, Staff) in detail |
| [Pipelines](architecture/pipelines.md) | Employer matching pipeline + Seeker discovery pipeline |

### API Reference
| Doc | Description |
|-----|-------------|
| [Conventions](api/conventions.md) | Pagination, error format, auth cookies, rate limits |
| [HR Portal API](api/hr-api.md) | Auth, jobs, applications, candidates, companies, dashboard |
| [Candidate Portal API](api/candidate-api.md) | Profile, CV, job discovery, HH/LinkedIn integrations |
| [Staff Admin API](api/staff-api.md) | Companies, ingestion, LLM costs, audit, consent |
| [Webhooks](api/webhooks.md) | Telegram, Payme, Resend, HH, LinkedIn |

### Features
| Doc | Description |
|-----|-------------|
| [Telegram Bot](features/telegram-bot.md) | All commands, onboarding state machine, referrals, push notifications |
| [Telegram Mini App](features/tma.md) | TMA auth, dual-role detection, all endpoints |
| [AI Agents](features/ai-agents.md) | 7 agents, LLM routing, cost tracking, pipelines |
| [Job Discovery](features/job-discovery.md) | HH.uz scraping, channel monitoring, scoring, auto-apply |

### Backend
| Doc | Description |
|-----|-------------|
| [Modules](backend/modules.md) | All 25 NestJS modules, guards, interceptors, decorators |
| [Background Workers](backend/workers.md) | 14 BullMQ queues, cron schedule, Bull Board |

### Frontend
| Doc | Description |
|-----|-------------|
| [Overview](frontend/overview.md) | 4 portals, 74 pages, 6 layouts, i18n |
| [State Management](frontend/state-management.md) | 8 Pinia stores, 20 composables |

### Integrations
| Doc | Description |
|-----|-------------|
| [HH.uz](integrations/hh-uz.md) | OAuth, employer API, resume ingestion, webhooks |
| [LinkedIn](integrations/linkedin.md) | OAuth, RapidAPI scraping, profile sync |
| [Payments](integrations/payments.md) | Payme gateway, invoice lifecycle |
| [Notifications](integrations/notifications.md) | Resend email, Eskiz SMS, Telegram push |

### Database
| Doc | Description |
|-----|-------------|
| [Schema](database/schema.md) | All 29 models with fields, relations, indexes |
| [Migrations](database/migrations.md) | Prisma migration workflow, pgvector setup |

### Infrastructure
| Doc | Description |
|-----|-------------|
| [Deployment](infrastructure/deployment.md) | CI/CD pipeline, GitHub Secrets, deploy steps |
| [Docker](infrastructure/docker.md) | 4 compose files, service resource limits |
| [nginx](infrastructure/nginx.md) | Routing rules, SSL, rate limiting, security headers |

### Operations
| Doc | Description |
|-----|-------------|
| [Environment Variables](ops/environment.md) | All 53 env vars — type, required, default, purpose |
| [Runbooks](ops/runbooks.md) | Common operational tasks and troubleshooting |

---

## Tech Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| API | NestJS | 11 |
| Frontend | Nuxt | 4 |
| Database | PostgreSQL + pgvector | 16 |
| Queue | BullMQ + Redis | — |
| ORM | Prisma | 5 |
| Telegram | grammY | 1.43 |
| Primary LLM | Anthropic Claude | claude-3-5-sonnet |
| Containers | Docker Compose + nginx | — |
| CI/CD | GitHub Actions → GHCR → SSH | — |

## Project Strategy

See [90-day-roadmap.md](90-day-roadmap.md) for the candidate-first Tashkent launch strategy.

**Core loop:**
1. Candidate sends CV or answers 5 questions via Telegram
2. AI structures profile, discovers Tashkent jobs from HH.uz + Telegram channels
3. Push best matches to candidate
4. AI helps them get hired: CV rewrite, interview prep, rejection feedback
5. Employers pay to access pre-screened, AI-ranked candidates
