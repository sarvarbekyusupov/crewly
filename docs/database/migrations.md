# Database Migrations

Prisma 5 migration workflow.

---

## Commands

```bash
# Development: create and apply new migration
cd backend
pnpm run db:migrate
# → prompts: "Enter migration name: add_telegram_channel_table"
# → creates: prisma/migrations/20260618_add_telegram_channel_table/migration.sql
# → applies migration to local DB

# Production: apply pending migrations (no new migration)
pnpm exec prisma migrate deploy
# Run this on every deploy (CI/CD does it automatically)

# Check migration status
pnpm exec prisma migrate status

# Reset database (dev only — DESTROYS ALL DATA)
pnpm exec prisma migrate reset
# → drops all tables, re-runs all migrations, re-runs seed

# Seed reference data
pnpm run db:seed

# Check pgvector extension exists before migrating
pnpm run db:check
# → psql $DATABASE_URL -c "SELECT * FROM pg_extension WHERE extname='vector'"
# → exits 1 if not found

# Open Prisma Studio (GUI)
pnpm run db:studio
# → opens browser at localhost:5555
```

---

## Workflow: Schema Change

```
1. Edit backend/prisma/schema.prisma

2. Run: pnpm run db:migrate
   → Prisma diffs schema vs database
   → Generates SQL migration file
   → Applies to local DB

3. Review generated SQL in prisma/migrations/TIMESTAMP_name/migration.sql

4. Commit both schema.prisma and the new migration file

5. Push to main → CI/CD runs:
   docker compose exec -T backend ./node_modules/.bin/prisma migrate deploy
```

---

## Migration File Structure

```
backend/prisma/migrations/
├── 20260101000000_init/
│   └── migration.sql           # initial schema
├── 20260215120000_add_pgvector/
│   └── migration.sql           # CREATE EXTENSION vector; ADD COLUMN embedding
├── 20260618000000_telegram_channels/
│   └── migration.sql           # CREATE TABLE telegram_channels
└── migration_lock.toml         # lock file — do not edit manually
```

---

## pgvector Setup

pgvector must be installed in PostgreSQL before any migration that uses vector columns.

### Docker (automated)

The `pgvector/pgvector:pg16` image already has pgvector installed. Just create the extension:

```sql
-- Runs once in initial migration
CREATE EXTENSION IF NOT EXISTS vector;
```

### Manual PostgreSQL

```bash
# Install pgvector extension
apt-get install postgresql-16-pgvector

# Then in psql:
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### Verify

```bash
pnpm run db:check
# Runs: SELECT * FROM pg_extension WHERE extname = 'vector'
# Exits 0 if found, 1 if not
```

---

## Seed Data

`backend/prisma/seed.ts` — runs on deploy after migrations.

Seeds:
- `CandidateSource` records: `hh.ru`, `linkedin`, `telegram`, `manual`
- Default `FeatureFlag` records
- Staff admin account (if `STAFF_SEED_EMAIL` and `STAFF_SEED_PASSWORD` env vars set)

```bash
pnpm run db:seed
# OR for production:
node prisma/dist/seed.js
```

The seed is **idempotent** — safe to run multiple times (uses upsert, not insert).

---

## Dangerous Operations

### Adding NOT NULL column to existing table

If table has data, add with DEFAULT first:
```sql
-- Add with default
ALTER TABLE candidates ADD COLUMN city TEXT NOT NULL DEFAULT '';

-- Later: remove default if desired
ALTER TABLE candidates ALTER COLUMN city DROP DEFAULT;
```

In Prisma schema:
```prisma
city String @default("")
```

Migrate → then remove `@default("")` in a second migration if needed.

### Renaming a column

Prisma will drop + recreate by default (data loss). Use `@@map`:
```prisma
// schema.prisma
telegramChatId String? @map("telegram_chat_id")
```

Or write raw SQL migration manually.

### Large table migrations

For tables with millions of rows (Candidate, Application, LlmCall), use `CREATE INDEX CONCURRENTLY` to avoid locking:

```sql
-- Add this to migration.sql manually before running
CREATE INDEX CONCURRENTLY IF NOT EXISTS candidate_email_idx ON candidates (email);
```

---

## Production Migration Checklist

Before deploying a schema change:

- [ ] Migration tested locally on copy of production data
- [ ] `pnpm run db:check` passes (pgvector available)
- [ ] No column drops without confirming data backed up
- [ ] Large table migrations use CONCURRENTLY
- [ ] Seed script updated if new reference data needed
- [ ] Rollback plan documented (reverse SQL ready if needed)
