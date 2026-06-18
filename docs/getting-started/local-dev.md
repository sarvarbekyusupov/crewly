# Local Development

Full development environment guide.

---

## Repository Structure

```
crewly/
├── backend/                   # NestJS 11 API
│   ├── src/
│   │   ├── modules/           # Feature modules (25)
│   │   ├── integrations/      # External services
│   │   ├── workers/           # BullMQ processors (14)
│   │   ├── common/            # Shared guards, pipes, interceptors
│   │   └── config/            # Env validation (Zod)
│   ├── prisma/
│   │   ├── schema.prisma      # 29 models
│   │   ├── migrations/        # SQL migration history
│   │   └── seed.ts            # Reference data seeder
│   └── Dockerfile
├── frontend/                  # Nuxt 4 + Vue 3
│   └── app/
│       ├── pages/             # 74 route files
│       ├── layouts/           # 6 layouts
│       ├── stores/            # 8 Pinia stores
│       ├── composables/       # 20 composables
│       └── components/        # 67 Vue components
├── packages/
│   └── types/                 # Shared TypeScript types
├── e2e/                       # Playwright tests
├── nginx/                     # Production nginx config
└── docs/                      # This documentation
```

---

## Environment Files

| File | Used By |
|------|---------|
| `backend/.env` | Local development |
| `backend/.env.production` | Production (written by CI/CD) |
| `backend/.env.example` | Template — copy to `.env` |
| `frontend/.env` | Frontend runtime config |

### All env vars reference

See [ops/environment.md](../ops/environment.md) for the full reference table.

---

## Backend Development

```bash
cd backend

# Install dependencies
pnpm install

# Watch mode (hot reload via NestJS --watch)
pnpm run start:dev

# Type check without running
pnpm run typecheck

# Run unit tests
pnpm run test

# Run unit tests in watch mode
pnpm run test:watch

# Run e2e tests (requires running DB)
pnpm run test:e2e

# Format code
pnpm run format

# Lint
pnpm run lint
```

### Backend ports

| Service | Port | Notes |
|---------|------|-------|
| NestJS API | 3000 | REST + webhooks |
| Bull Board | 3000/admin/queues | Queue monitoring UI |
| Prisma Studio | 5555 | `pnpm run db:studio` |

---

## Frontend Development

```bash
cd frontend

# Install dependencies
pnpm install

# Dev server with hot reload
pnpm run dev
# App: http://localhost:3030

# Type check
pnpm run typecheck

# Unit tests (Vitest)
pnpm run test

# Lint
pnpm run lint
pnpm run lint:fix

# Production build
pnpm run build

# Preview production build
pnpm run preview
```

### Frontend env (optional)

`frontend/.env`:
```env
NUXT_PUBLIC_API_BASE=http://localhost:3000
```

---

## Database Commands

```bash
cd backend

# Create new migration from schema changes
pnpm run db:migrate
# Prompts for migration name. Creates SQL in prisma/migrations/

# Apply pending migrations (no new migration created)
pnpm exec prisma migrate deploy

# Reset database (drops + recreates + seeds)
pnpm exec prisma migrate reset

# Open Prisma Studio (browser GUI)
pnpm run db:studio

# Seed reference data only
pnpm run db:seed

# Check pgvector extension exists
pnpm run db:check
# Fails if CREATE EXTENSION vector not available — run once on new DB:
# psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

---

## IDE Setup (VS Code)

Recommended extensions:
- **Prisma** — schema syntax highlighting, formatting
- **Vue - Official (Volar)** — Vue 3 + Nuxt support
- **TypeScript Vue Plugin (Volar)**
- **ESLint**
- **Prettier**
- **Thunder Client** — REST client for testing API

Workspace settings (`settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[vue]": { "editor.defaultFormatter": "Vue.volar" },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

---

## Useful Development Tricks

### Skip LLM calls in dev

If you don't have an LLM key, workers that call agents will fail. To suppress:
- Don't trigger ingestion or matching
- Use the web portals for CRUD operations
- Telegram bot basic commands (/start, /help, /myapps) work without LLM

### Inspect queues

Bull Board at `http://localhost:3000/admin/queues` shows:
- Active jobs (currently running)
- Waiting jobs (queued)
- Failed jobs with full error + stack trace
- Delayed jobs (retries with backoff)

Click any job to see its payload and logs.

### Telegram bot local dev

1. Set `TELEGRAM_BOT_TOKEN` in `backend/.env`
2. Start backend (`pnpm run start:dev`)
3. Bot uses **polling** mode when `NODE_ENV=development`
4. Messages you send to the bot go to your local process

> Only run one instance at a time. If production server also tries to poll, messages split randomly between instances.

### Test webhooks locally

Use [ngrok](https://ngrok.com) or [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/):

```bash
ngrok http 3000
# Exposes: https://abc123.ngrok.io → localhost:3000
```

Then:
```env
PUBLIC_URL=https://abc123.ngrok.io
TELEGRAM_WEBHOOK_URL=https://abc123.ngrok.io/webhooks/telegram
```

Set `NODE_ENV=production` temporarily to force webhook mode.

---

## Common Issues

### `Cannot find module @crewly/types`
```bash
cd packages/types && pnpm install
```

### Prisma generate fails
```bash
cd backend && pnpm exec prisma generate
```

### pgvector not found
```bash
# Connect to your postgres and run:
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS vector;"
# Then retry migration
```

### Port 3000 already in use
```bash
lsof -i :3000 | grep LISTEN
kill -9 <PID>
```

### Redis connection refused
```bash
make dev-infra  # ensure postgres + redis are running
docker ps       # check containers are healthy
```
