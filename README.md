# Crewly

AI-native recruiting platform for companies: post roles, AI sourcing and screening, outreach, hires with placement billing.

## Stack

| Layer | Tech |
|-------|------|
| API | NestJS 11, Prisma, PostgreSQL 16 + pgvector, Redis, Bull |
| Web | Nuxt 3 (SPA), Pinia, Nuxt UI, i18n (en / ru / uz) |
| Shared types | `packages/types` |

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io) 9+
- Docker (optional, for Postgres + Redis)

## Quick start (local)

```bash
pnpm install

# Infra only (Postgres + Redis)
make dev-db && make dev-redis
# or full stack: make up

# Backend
cp backend/.env.example backend/.env
# Edit SESSION_SECRET (min 32 chars): openssl rand -hex 32
cd backend && pnpm db:migrate && pnpm db:seed && pnpm dev
# API: http://localhost:3000

# Frontend (another terminal)
export NUXT_PUBLIC_API_BASE=http://localhost:3000
cd frontend && pnpm dev
# UI: http://localhost:3001
```

Demo company user (after seed): `admin@test.local` / `test1234`  
Staff: `staff@agency.local` / `staff1234`

## Environment

| File | Purpose |
|------|---------|
| [backend/.env.example](backend/.env.example) | Local API (DB `crewly` on port 5432) |
| [.env.example](.env.example) | Production Docker Compose template |

Key variables:

- `DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET` (required)
- `FRONTEND_URL` — CORS origin (default `http://localhost:3001`)
- `NUXT_PUBLIC_API_BASE` — frontend API URL (default `http://localhost:3000`)

In local dev, Nuxt proxies `/api` to the backend so SSE and cookies work on one origin.

## Scripts (root)

```bash
pnpm dev:backend      # Nest watch :3000
pnpm dev:frontend     # Nuxt :3001
pnpm build:backend
pnpm build:frontend
pnpm typecheck        # all workspace packages
```

## Tests

```bash
pnpm --filter backend test
```

Integration-style tests use mocked Prisma and run in CI without a database.

## Production deploy

Jenkins builds and pushes Docker images, then deploys with `docker-compose.prod.yml` on the target host. See [Jenkinsfile](Jenkinsfile) and [Makefile](Makefile).

- API health: `GET /health`
- Swagger (non-production): `/api/docs`
- Bull Board: `/admin/queues` (HTTP basic auth)

## Project layout

```
backend/     NestJS API + workers + Prisma
frontend/    Nuxt company + staff portals
packages/types/  Shared API types
e2e/         Playwright (manual / optional CI)
```
