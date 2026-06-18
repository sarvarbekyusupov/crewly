# Deployment

Single VPS + Docker Compose + GitHub Actions CI/CD.

---

## Architecture

```
GitHub (source)
  └── GitHub Actions (CI/CD)
        ├── Build Docker images
        ├── Push to GHCR (GitHub Container Registry)
        └── SSH deploy to VPS

VPS
  └── /srv/crewly/
        ├── docker-compose.prod.yml
        ├── nginx/nginx.conf
        ├── .env.production        ← secrets (manually maintained + CI patches)
        └── .env.images            ← image tags (written by CI each deploy)
```

---

## CI/CD Pipeline

**File:** `.github/workflows/ci-cd.yml`  
**Trigger:** Push to `main`

### Job 1: `build-push`

Runs on every push to `main`. Builds and pushes Docker images.

```yaml
- uses: actions/checkout@v4
- uses: docker/setup-buildx-action@v3

- name: Build & push backend
  uses: docker/build-push-action@v6
  with:
    context: .
    file: backend/Dockerfile
    push: true
    tags: |
      ghcr.io/<owner>/crewly-backend:latest
      ghcr.io/<owner>/crewly-backend:<git-sha>
    cache-from: type=gha
    cache-to: type=gha,mode=max

- name: Build & push frontend
  uses: docker/build-push-action@v6
  with:
    file: frontend/Dockerfile
    build-args: |
      NUXT_PUBLIC_API_BASE=<PUBLIC_URL>
      NUXT_PUBLIC_WAITLIST_MODE=<WAITLIST_MODE>
      BACKEND_URL=http://backend:3000
    tags: |
      ghcr.io/<owner>/crewly-frontend:latest
      ghcr.io/<owner>/crewly-frontend:<git-sha>
```

### Job 2: `deploy`

Depends on `build-push`. SSHs to VPS and runs deploy script.

```bash
# On VPS:
cd /srv/crewly

# 1. Patch .env.production with required vars
patch_env() { sed -i "/^${1}=/d" .env.production; printf '%s=%s\n' "$1" "$2" >> .env.production; }
patch_env NODE_ENV                "production"
patch_env PUBLIC_URL              "$DEPLOY_PUBLIC_URL"
patch_env TELEGRAM_BOT_TOKEN      "$DEPLOY_TG_TOKEN"
patch_env TELEGRAM_WEBHOOK_SECRET "$DEPLOY_TG_SECRET"
patch_env ADMIN_TELEGRAM_CHAT_ID  "$DEPLOY_ADMIN_CHAT_ID"

# 2. Set image tags
echo "IMAGE_BACKEND=ghcr.io/<owner>/crewly-backend:<sha>" > .env.images
echo "IMAGE_FRONTEND=ghcr.io/<owner>/crewly-frontend:<sha>" >> .env.images

# 3. Login to GHCR
printf '%s' "$DEPLOY_GHCR_TOKEN" | docker login ghcr.io -u "$GITHUB_ACTOR" --password-stdin

# 4. Clean up old images (free disk space)
docker system prune -f
docker image prune -af

# 5. Pull new images
docker compose -f docker-compose.prod.yml \
  --env-file .env.production --env-file .env.images pull

# 6. Start/restart containers
docker compose -f docker-compose.prod.yml \
  --env-file .env.production --env-file .env.images \
  up -d --remove-orphans

# 7. Wait for startup
sleep 20

# 8. Health check
curl -sf http://localhost/health && echo "Deploy OK" \
  || { docker compose -f docker-compose.prod.yml logs --tail=40; exit 1; }

# 9. Run migrations
docker compose exec -T backend ./node_modules/.bin/prisma migrate deploy

# 10. Run seed
docker compose exec -T backend node prisma/dist/seed.js

# 11. Verify Telegram webhook
curl -sf "https://api.telegram.org/bot${DEPLOY_TG_TOKEN}/getWebhookInfo"
```

---

## Required GitHub Secrets

**Settings → Secrets and variables → Actions**

| Secret Name | Value | Purpose |
|-------------|-------|---------|
| `SSH_HOST` | VPS IP or hostname | SSH connection target |
| `SSH_USER` | e.g. `ubuntu` | SSH username |
| `SSH_KEY` | SSH private key (PEM format) | Authentication |
| `PUBLIC_URL` | `https://crewly.uz` | Backend public URL for webhooks, OAuth |
| `GHCR_TOKEN` | GitHub PAT with `read:packages` | Pull images on VPS |
| `TELEGRAM_BOT_TOKEN` | From @BotFather | Bot authentication |
| `TELEGRAM_WEBHOOK_SECRET` | Random 32+ char string | Webhook verification |
| `ADMIN_TELEGRAM_CHAT_ID` | Your numeric Telegram ID | Admin command guard |

**Optional Variables (Settings → Variables):**

| Variable | Value |
|----------|-------|
| `WAITLIST_MODE` | `true` or `false` (frontend build arg) |

---

## First-Time VPS Setup

Run once before first CI/CD deploy:

```bash
# 1. Connect to VPS
ssh user@your-vps-ip

# 2. Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 3. Create deploy directory
sudo mkdir -p /srv/crewly
sudo chown $USER:$USER /srv/crewly

# 4. Upload production files
scp docker-compose.prod.yml user@vps:/srv/crewly/
scp nginx/nginx.conf user@vps:/srv/crewly/nginx/

# 5. Create SSL certificate directory
mkdir -p /srv/crewly/nginx/certs

# 6. Place SSL certificates
# Using Let's Encrypt (certbot):
sudo apt install certbot
sudo certbot certonly --standalone -d crewly.uz -d www.crewly.uz
sudo cp /etc/letsencrypt/live/crewly.uz/fullchain.pem /srv/crewly/nginx/certs/
sudo cp /etc/letsencrypt/live/crewly.uz/privkey.pem /srv/crewly/nginx/certs/

# 7. Create .env.production with base vars (everything except what CI patches)
cat > /srv/crewly/.env.production << 'EOF'
DATABASE_URL=postgresql://crewly:STRONGPASSWORD@postgres:5432/crewly
REDIS_URL=redis://redis:6379
SESSION_SECRET=<generate: openssl rand -hex 32>
JWT_ACCESS_SECRET=<generate: openssl rand -hex 32>
JWT_CANDIDATE_SECRET=<generate: openssl rand -hex 32>
JWT_REFRESH_SECRET=<generate: openssl rand -hex 32>
BULL_BOARD_PASSWORD=<generate: openssl rand -hex 16>
FRONTEND_URL=https://crewly.uz
ANTHROPIC_API_KEY=sk-ant-...
HH_EMPLOYER_TOKEN=...
HH_EMPLOYER_ID=...
RESEND_API_KEY=re_...
FROM_EMAIL=noreply@crewly.uz
S3_ENDPOINT=...
S3_BUCKET=crewly-uploads
# etc — all from environment.md
EOF

# 8. Push to main → CI/CD handles rest
```

---

## Rollback

If deploy breaks production:

```bash
# SSH to VPS
cd /srv/crewly

# Find previous SHA from GHCR or git log
PREV_SHA=<sha-of-last-good-deploy>

# Update .env.images to previous tags
cat > .env.images << EOF
IMAGE_BACKEND=ghcr.io/<owner>/crewly-backend:$PREV_SHA
IMAGE_FRONTEND=ghcr.io/<owner>/crewly-frontend:$PREV_SHA
EOF

# Restart with old images
docker compose -f docker-compose.prod.yml \
  --env-file .env.production --env-file .env.images \
  up -d

# Verify
curl -sf http://localhost/health
```

---

## SSL Certificate Renewal

Let's Encrypt certs expire every 90 days. Renew:

```bash
# Renew (nginx must stop briefly)
docker compose -f docker-compose.prod.yml stop nginx
sudo certbot renew
sudo cp /etc/letsencrypt/live/crewly.uz/fullchain.pem /srv/crewly/nginx/certs/
sudo cp /etc/letsencrypt/live/crewly.uz/privkey.pem /srv/crewly/nginx/certs/
docker compose -f docker-compose.prod.yml start nginx
```

Or use `--webroot` mode to renew without stopping nginx.  
Automate with cron: `0 3 1 * * certbot renew --quiet`.
