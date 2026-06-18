# Quickstart

Get Crewly running locally in ~5 minutes using Docker Compose.

## Prerequisites

- Docker Desktop (or Docker Engine + Compose v2)
- Node.js 20+ and pnpm 9+
- Git

---

## 1. Clone and configure

```bash
git clone https://github.com/<your-org>/crewly.git
cd crewly
cp backend/.env.example backend/.env
```

Open `backend/.env` and fill the **minimum required values**:

```env
# Database (pre-filled for Docker Compose)
DATABASE_URL="postgresql://crewly:crewly@localhost:5435/crewly"
REDIS_URL="redis://localhost:6379"

# Auth secrets — generate with: openssl rand -hex 32
SESSION_SECRET=<32+ chars>
JWT_ACCESS_SECRET=<32+ chars>
JWT_CANDIDATE_SECRET=<32+ chars>
JWT_REFRESH_SECRET=<32+ chars>

# Bull Board dashboard password
BULL_BOARD_PASSWORD=<16+ chars>

# URLs
FRONTEND_URL=http://localhost:3030
PUBLIC_URL=http://localhost:3000
```

---

## 2. Start infrastructure

```bash
# Starts postgres (port 5435) + redis (port 6379) only
make dev-infra
```

---

## 3. Database setup

```bash
cd backend
pnpm install
pnpm run db:migrate   # creates tables
pnpm run db:seed      # seeds reference data
```

---

## 4. Start backend

```bash
# Still in backend/
pnpm run start:dev
# API: http://localhost:3000
# Bull Board: http://localhost:3000/admin/queues
```

---

## 5. Start frontend

```bash
cd ../frontend
pnpm install
pnpm run dev
# App: http://localhost:3030
```

---

## 6. Verify

| Check | URL |
|-------|-----|
| API health | `curl http://localhost:3000/health` → 200 OK |
| HR portal | http://localhost:3030/employer |
| Candidate portal | http://localhost:3030/candidate |
| Staff portal | http://localhost:3030/staff |
| Bull Board | http://localhost:3000/admin/queues |

---

## Optional: Telegram bot (dev)

1. Create bot at `@BotFather` → copy token
2. Add to `backend/.env`:
   ```env
   TELEGRAM_BOT_TOKEN=<token>
   TELEGRAM_WEBHOOK_SECRET=<any-random-string>
   ```
3. Dev mode uses **polling** automatically (`NODE_ENV=development`)
4. Bot receives messages while `pnpm run start:dev` is running

---

## Optional: AI features

Add at least one LLM key to `backend/.env`:

```env
ANTHROPIC_API_KEY=sk-ant-...   # recommended
# OR
GROQ_API_KEY=gsk_...
# OR
OPENAI_API_KEY=sk-...
```

Without an LLM key, agent-dependent features (CV parsing, job matching, screening) will fail silently.

---

## Next steps

- [Local Development](local-dev.md) — full IDE setup, hot reload, debugging
- [Deployment](../infrastructure/deployment.md) — deploy to production
- [Telegram Bot](../features/telegram-bot.md) — set up bot commands
