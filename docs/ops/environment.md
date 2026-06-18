# Environment Variables

Full reference for `backend/.env`. Validated at startup by `backend/src/config/env.validation.ts` (Zod).

App crashes on startup if any **Required** variable is missing or invalid.

---

## Required Minimum (app won't start without these)

```env
DATABASE_URL=postgresql://user:pass@host:5432/crewly
SESSION_SECRET=<32+ chars>
JWT_ACCESS_SECRET=<32+ chars>
JWT_CANDIDATE_SECRET=<32+ chars>
JWT_REFRESH_SECRET=<32+ chars>
BULL_BOARD_PASSWORD=<16+ chars>
FRONTEND_URL=https://crewly.uz
PUBLIC_URL=https://crewly.uz
```

Generate secrets:
```bash
openssl rand -hex 32   # for 64-char hex secrets
openssl rand -base64 32  # for 44-char base64
```

---

## Core

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `NODE_ENV` | `development\|production\|test` | No | `development` | **Must be `production` on server** — controls Telegram polling vs webhook mode |
| `PORT` | number | No | `3000` | API server listen port |
| `PUBLIC_URL` | URL | **Yes** | — | Backend public URL. Used for: Telegram webhook registration, OAuth callbacks, email links |
| `FRONTEND_URL` | URL | **Yes** | — | Frontend origin. Used for CORS and redirect URLs |
| `LOG_LEVEL` | `fatal\|error\|warn\|info\|debug\|trace` | No | `info` | Pino log verbosity |
| `SENTRY_DSN` | string | No | — | Sentry error tracking DSN |

---

## Database

| Variable | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `DATABASE_URL` | PostgreSQL URL | **Yes** | — | `postgresql://user:pass@host:5432/dbname` |
| `DIRECT_URL` | PostgreSQL URL | No | — | Direct DB connection bypassing PgBouncer. Required for Prisma migrations if using connection pooling |
| `REDIS_URL` | Redis URL | No | `redis://localhost:6379` | BullMQ queue backend |

---

## Authentication Secrets

> All must be ≥32 chars. Use different values for each — never reuse.

| Variable | Required | Description |
|----------|----------|-------------|
| `SESSION_SECRET` | **Yes** | Session cookie encryption key |
| `JWT_ACCESS_SECRET` | **Yes** | HR JWT access token signing key |
| `JWT_CANDIDATE_SECRET` | **Yes** | Candidate JWT access token signing key (separate from HR) |
| `JWT_REFRESH_SECRET` | **Yes** | Refresh token signing key (shared between HR and Candidate) |
| `JWT_ACCESS_TTL_SECONDS` | No (default: 900) | Access token lifetime in seconds (900 = 15 min) |
| `BULL_BOARD_PASSWORD` | **Yes** | Bull Board admin UI password (≥16 chars) |

---

## LLM Providers

At least one required for AI features.

| Variable | Type | Description |
|----------|------|-------------|
| `ANTHROPIC_API_KEY` | string | Claude API. Recommended: `claude-3-5-sonnet`. Format: `sk-ant-api03-...` |
| `OPENAI_API_KEY` | string | GPT-4o API. Format: `sk-...` |
| `GROQ_API_KEY` | string | Groq fast inference (llama-3.3-70b). Format: `gsk_...` |
| `AWS_BEARER_TOKEN_BEDROCK` | string | AWS Bedrock auth token |
| `AWS_BEDROCK_REGION` | string | Default: `us-east-1` |
| `TAVILY_API_KEY` | string | Tavily web search for agents |
| `JSEARCH_RAPIDAPI_KEY` | string | JSearch RapidAPI for job listings |
| `LANGFUSE_PUBLIC_KEY` | string | Langfuse LLM tracing (optional) |
| `LANGFUSE_SECRET_KEY` | string | Langfuse secret (optional) |
| `LANGFUSE_HOST` | URL | Langfuse self-hosted URL (optional) |

---

## Telegram

> **All three required for the bot to function in production.**

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | For bot | Token from @BotFather. Format: `1234567890:ABCdef...` |
| `TELEGRAM_WEBHOOK_SECRET` | For bot | Secret for webhook verification. Random 32+ chars |
| `TELEGRAM_WEBHOOK_URL` | No | Override webhook URL. Defaults to `PUBLIC_URL/api/v1/webhooks/telegram` |
| `ADMIN_TELEGRAM_CHAT_ID` | For /stats, /addchannel | Numeric Telegram chat ID. Get from @userinfobot |

---

## HH.uz

| Variable | Required | Description |
|----------|----------|-------------|
| `HH_EMPLOYER_TOKEN` | For HH.uz employer API | Static employer bearer token from HH.uz |
| `HH_EMPLOYER_ID` | For job publishing | HH.uz employer account ID |
| `HH_CLIENT_ID` | Identity-only (GET /me) | OAuth2 app client ID — applicant API closed; token used for identity check only |
| `HH_CLIENT_SECRET` | Identity-only (GET /me) | OAuth2 app client secret |
| `HH_REDIRECT_URI` | Identity-only (GET /me) | Callback URL. `PUBLIC_URL/auth/hh/callback` |
| `HH_USER_AGENT` | No | Default: `Crewly/1.0 (contact@crewly.uz)`. Required by HH API |
| `HH_WEBHOOK_SECRET` | For HH webhooks | Verification token for HH.uz → Crewly webhooks |
| `HH_SPECIALIZATIONS` | No | Default: `1.221`. Comma-separated HH specialization IDs for candidate ingestion |

---

## Email — Resend

| Variable | Required | Description |
|----------|----------|-------------|
| `RESEND_API_KEY` | For email | Resend API key. Format: `re_...` |
| `RESEND_WEBHOOK_SECRET` | For email webhooks | Svix webhook signing secret |
| `FROM_EMAIL` | No | Default: `noreply@crewly.uz`. Sender address |

---

## SMS — Eskiz

| Variable | Required | Description |
|----------|----------|-------------|
| `ESKIZ_EMAIL` | For SMS | Eskiz account email |
| `ESKIZ_PASSWORD` | For SMS | Eskiz account password |
| `ESKIZ_FROM` | No | Default: `4546`. SMS sender name/code |

---

## File Storage — S3

| Variable | Required | Description |
|----------|----------|-------------|
| `S3_ENDPOINT` | For file upload | S3-compatible endpoint. e.g. `https://r2.cloudflarestorage.com` |
| `S3_REGION` | For file upload | e.g. `auto` (Cloudflare R2) or `us-east-1` (AWS) |
| `S3_ACCESS_KEY` | For file upload | S3 access key ID |
| `S3_SECRET_KEY` | For file upload | S3 secret access key |
| `S3_BUCKET` | For file upload | Bucket name. e.g. `crewly-uploads` |

---

## Google

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_CLIENT_ID` | For Google OAuth | OAuth2 client ID (Google Cloud Console) |
| `GOOGLE_CLIENT_SECRET` | For Google OAuth | OAuth2 client secret |
| `GOOGLE_CALLBACK_URL` | For Google OAuth | Callback URL. e.g. `PUBLIC_URL/api/v1/candidate-auth/google/callback` |
| `GOOGLE_REFRESH_TOKEN` | For Google Calendar | Service account refresh token for interview scheduling |

---

## LinkedIn

| Variable | Required | Description |
|----------|----------|-------------|
| `LINKEDIN_RAPIDAPI_KEY` | For LinkedIn scraping | RapidAPI key for LinkedIn API |
| `LINKEDIN_RAPIDAPI_HOST` | For LinkedIn scraping | e.g. `linkedin-api8.p.rapidapi.com` |
| `LINKEDIN_EMAIL` | Fallback | LinkedIn account email (fallback scraping) |
| `LINKEDIN_PASSWORD` | Fallback | LinkedIn account password |

---

## Payment — Payme

| Variable | Required | Description |
|----------|----------|-------------|
| `PAYME_MERCHANT_ID` | For payments | Payme merchant account ID |
| `PAYME_MERCHANT_KEY` | For payments | Payme merchant signing key (used as Basic auth password) |
| `PAYMENT_WEBHOOK_SECRET` | For generic payment webhook | HMAC-SHA256 signing secret |

---

## Frontend Variables

These go in `frontend/.env` (not backend). Also passed as Docker build args.

| Variable | Description |
|----------|-------------|
| `NUXT_PUBLIC_API_BASE` | Backend URL. Baked into JS bundle at build time. e.g. `https://crewly.uz` |
| `NUXT_PUBLIC_SENTRY_DSN` | Sentry DSN for frontend errors |
| `NUXT_PUBLIC_WAITLIST_MODE` | `true` = show waitlist page, `false` = show full app |

> **NUXT_PUBLIC_API_BASE** is baked into the frontend build at compile time. Changing it requires rebuilding the frontend Docker image.

---

## GitHub Secrets → Server Mapping

CI/CD writes these to `.env.production` on every deploy:

| GitHub Secret | Written as |
|--------------|-----------|
| `PUBLIC_URL` | `PUBLIC_URL` |
| `TELEGRAM_BOT_TOKEN` | `TELEGRAM_BOT_TOKEN` |
| `TELEGRAM_WEBHOOK_SECRET` | `TELEGRAM_WEBHOOK_SECRET` |
| `ADMIN_TELEGRAM_CHAT_ID` | `ADMIN_TELEGRAM_CHAT_ID` |
| *(hardcoded)* | `NODE_ENV=production` |

All other vars must be set manually in `/srv/crewly/.env.production` on the server.
