# Runbooks

Common operational tasks and troubleshooting.

---

## Telegram Bot

### Bot not responding to messages

**Symptom:** Messages sent to bot → no response.

**Diagnosis:**
```bash
# Check webhook registration
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo | jq .

# Expected:
# { "url": "https://crewly.uz/api/v1/webhooks/telegram", "has_custom_certificate": false, "pending_update_count": 0 }
```

**Common causes:**

1. `NODE_ENV` not set to `production` on server:
   ```bash
   # SSH to server
   docker compose -f docker-compose.prod.yml exec backend printenv NODE_ENV
   # Should print: production
   # If empty/wrong: check .env.production has NODE_ENV=production
   ```

2. Webhook secret mismatch:
   ```bash
   # Re-register webhook manually
   curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url":"https://crewly.uz/api/v1/webhooks/telegram","secret_token":"<TELEGRAM_WEBHOOK_SECRET>"}'
   ```

3. Backend container crashed:
   ```bash
   docker compose -f docker-compose.prod.yml ps
   docker compose -f docker-compose.prod.yml logs backend --tail=50
   ```

---

### Re-register Telegram webhook

```bash
# Use bot token and webhook secret from .env.production
source /srv/crewly/.env.production

curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"${PUBLIC_URL}/api/v1/webhooks/telegram\",\"secret_token\":\"${TELEGRAM_WEBHOOK_SECRET}\"}"
```

---

## Deployments

### Deploy failed — health check timeout

```bash
# Check what happened
docker compose -f docker-compose.prod.yml logs --tail=100 backend

# Common: migration failed
# Re-run manually:
docker compose -f docker-compose.prod.yml exec -T backend \
  ./node_modules/.bin/prisma migrate deploy

# Common: env var missing → app crashed on startup
docker compose -f docker-compose.prod.yml exec backend printenv | grep -E "DATABASE_URL|JWT_ACCESS"
```

### Manual deploy (without CI)

```bash
ssh user@vps
cd /srv/crewly

# Pull latest images (requires GHCR_TOKEN)
echo $GHCR_TOKEN | docker login ghcr.io -u <username> --password-stdin
docker compose -f docker-compose.prod.yml pull

# Restart
docker compose -f docker-compose.prod.yml up -d --remove-orphans

# Run migrations
docker compose -f docker-compose.prod.yml exec -T backend \
  ./node_modules/.bin/prisma migrate deploy
```

---

## Database

### Connect to production database

```bash
# Via docker exec (no port exposed)
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U crewly -d crewly

# Common queries:
SELECT COUNT(*) FROM candidates;
SELECT COUNT(*) FROM applications WHERE status = 'screening';
SELECT SUM(cost_usd) FROM llm_calls WHERE created_at > NOW() - INTERVAL '30 days';
```

### Database backup

```bash
# Manual backup
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U crewly crewly > backup_$(date +%Y%m%d_%H%M).sql

# Restore from backup
cat backup_20260618_1200.sql | docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U crewly crewly
```

### Disk space for postgres data

```bash
docker system df  # show Docker disk usage
du -sh /var/lib/docker/volumes/crewly_postgres_data/  # postgres volume size
```

---

## Queue Workers

### Check queue status

**Bull Board:** `https://crewly.uz/admin/queues` (password: `BULL_BOARD_PASSWORD`)

**CLI:**
```bash
docker compose -f docker-compose.prod.yml exec backend \
  node -e "
const Queue = require('bull');
const q = new Queue('score-seeker-jobs', process.env.REDIS_URL);
q.getJobCounts().then(console.log);
"
```

### Worker stuck / high queue depth

```bash
# Retry all failed jobs in a queue
docker compose exec backend node -e "
const Queue = require('bull');
const q = new Queue('parse-candidate', process.env.REDIS_URL);
q.retryJobs().then(n => console.log('Retried', n));
"

# Clear failed jobs (last resort)
docker compose exec backend node -e "
const Queue = require('bull');
const q = new Queue('parse-candidate', process.env.REDIS_URL);
q.clean(0, 'failed').then(n => console.log('Cleaned', n.length));
"
```

---

## LLM Costs

### Check this month's spend

```bash
# Via API (staff login required)
curl -s https://crewly.uz/api/v1/llm-calls/summary \
  -H "Cookie: staff_session=<token>" | jq .

# Direct DB
docker compose exec postgres psql -U crewly crewly -c "
SELECT provider, model,
  COUNT(*) as calls,
  SUM(prompt_tokens + completion_tokens) as total_tokens,
  ROUND(SUM(cost_usd)::numeric, 4) as total_cost_usd
FROM llm_calls
WHERE created_at > DATE_TRUNC('month', NOW())
GROUP BY provider, model
ORDER BY total_cost_usd DESC;
"
```

---

## Monitoring

### Check container health

```bash
docker compose -f docker-compose.prod.yml ps
# All should show "healthy" or "Up"
```

### Check nginx access log for errors

```bash
docker compose -f docker-compose.prod.yml logs nginx | grep " 5[0-9][0-9] "
```

### View backend errors

```bash
docker compose -f docker-compose.prod.yml logs backend | grep -E "ERROR|WARN" | tail -50
```

### Redis memory usage

```bash
docker compose exec redis redis-cli INFO memory | grep used_memory_human
```

---

## Add Telegram Channel for Job Monitoring

1. Get channel numeric ID:
   - Add `@userinfobot` to channel temporarily and post
   - Or use `@getidsbot`

2. Add bot as admin to channel (must have "Read messages" permission)

3. Register via admin Telegram command:
   ```
   /addchannel -1001234567890
   ```
   (numeric ID — negative for channels)

4. Verify in DB:
   ```sql
   SELECT * FROM telegram_channels WHERE is_active = true;
   ```

---

## Create Staff Admin Account

```bash
# Via Prisma (no web UI for staff creation)
docker compose exec backend node -e "
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');
const prisma = new PrismaClient();

async function main() {
  const hash = await argon2.hash('STRONG_PASSWORD_HERE');
  await prisma.staff.create({
    data: { email: 'admin@crewly.uz', fullName: 'Admin', passwordHash: hash }
  });
  console.log('Staff created');
}
main().finally(() => prisma.\$disconnect());
"
```

---

## Emergency: Stop Bot (maintenance mode)

```bash
# Delete Telegram webhook (bot stops receiving messages)
curl -X POST "https://api.telegram.org/bot<TOKEN>/deleteWebhook"

# Restore:
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d '{"url":"https://crewly.uz/api/v1/webhooks/telegram","secret_token":"<SECRET>"}'
```
