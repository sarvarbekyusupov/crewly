# Docker

4 Docker Compose files for different environments.

---

## Compose Files

| File | Use Case | Services |
|------|----------|---------|
| `docker-compose.yml` | Full local stack (builds images) | postgres, redis, backend, frontend |
| `docker-compose.dev.yml` | Infra only (fastest dev) | postgres, redis |
| `docker-compose.prod.yml` | Production | postgres, redis, backend, frontend, nginx |
| `docker-compose.local-prod.yml` | Test prod setup locally | postgres, redis, backend, frontend, nginx |

---

## Production Compose (`docker-compose.prod.yml`)

### Services

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    mem_limit: 512m
    cpus: 0.5
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - internal
    restart: unless-stopped
    healthcheck:
      test: pg_isready -U postgres
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    mem_limit: 128m
    cpus: 0.25
    command: redis-server --appendonly yes --save 60 1
    volumes:
      - redis_data:/data
    networks:
      - internal
    restart: unless-stopped

  backend:
    image: ${IMAGE_BACKEND}       # set in .env.images by CI
    mem_limit: 768m
    cpus: 1.0
    env_file:
      - .env.production
    networks:
      - internal
    restart: unless-stopped
    healthcheck:
      test: curl -sf http://localhost:3000/health
      start_period: 60s
      interval: 30s

  frontend:
    image: ${IMAGE_FRONTEND}
    mem_limit: 256m
    cpus: 0.5
    environment:
      - NODE_OPTIONS=--max-old-space-size=200
    networks:
      - internal
    restart: unless-stopped

  nginx:
    image: nginx:1.27-alpine
    mem_limit: 64m
    cpus: 0.25
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/certs:/etc/nginx/certs:ro
    depends_on:
      - backend
      - frontend
    networks:
      - internal
    restart: unless-stopped

networks:
  internal:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
```

### Resource Summary

| Service | Memory | CPU |
|---------|--------|-----|
| nginx | 64m | 0.25 |
| frontend | 256m | 0.5 |
| postgres | 512m | 0.5 |
| backend | 768m | 1.0 |
| redis | 128m | 0.25 |
| **Total** | **~1.8 GB** | **~2.5 cores** |

VPS recommendation: 4 GB RAM, 2 vCPUs minimum. 8 GB RAM recommended for headroom.

---

## Dev Infra Only (`docker-compose.dev.yml`)

Minimal — just database + cache for local development.

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    ports:
      - "5435:5432"     # exposed on 5435 to avoid conflicts with local postgres
    environment:
      POSTGRES_USER: crewly
      POSTGRES_PASSWORD: crewly
      POSTGRES_DB: crewly

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

```bash
make dev-infra         # start
make dev-infra-stop    # stop
make dev-logs          # tail logs
```

---

## Docker Images

### Backend (`backend/Dockerfile`)

Multi-stage build:
```
Stage 1: node:20-alpine (builder)
  → COPY package.json pnpm-lock.yaml
  → pnpm install
  → COPY src/
  → pnpm run build       (nest build → dist/)
  → pnpm exec prisma generate

Stage 2: node:20-alpine (production)
  → COPY --from=builder dist/
  → COPY --from=builder node_modules/
  → COPY prisma/ (for migrations)
  → CMD ["node", "dist/main.js"]
```

### Frontend (`backend/Dockerfile`)

```
Stage 1: node:20-alpine (builder)
  → Build args: NUXT_PUBLIC_API_BASE, NUXT_PUBLIC_WAITLIST_MODE, BACKEND_URL
  → COPY frontend/
  → pnpm run build       (nuxt build → .output/)

Stage 2: node:20-alpine (production)
  → COPY --from=builder .output/
  → CMD ["node", ".output/server/index.mjs"]
  → NODE_OPTIONS: --max-old-space-size=200
```

### Key Build Args (Frontend)

| Arg | Value Source | Effect |
|-----|-------------|--------|
| `NUXT_PUBLIC_API_BASE` | `secrets.PUBLIC_URL` | Baked into JS bundle — backend URL |
| `NUXT_PUBLIC_WAITLIST_MODE` | `vars.WAITLIST_MODE` | Show waitlist page instead of app |
| `BACKEND_URL` | `http://backend:3000` | SSR server-to-server calls |

> `NUXT_PUBLIC_API_BASE` is baked at build time. To change it, you must rebuild the frontend image.

---

## Image Registry

GitHub Container Registry (GHCR):
```
ghcr.io/<github-owner>/crewly-backend:latest
ghcr.io/<github-owner>/crewly-backend:<git-sha>
ghcr.io/<github-owner>/crewly-frontend:latest
ghcr.io/<github-owner>/crewly-frontend:<git-sha>
```

Images are public (default GHCR behavior for public repos) or private (requires `GHCR_TOKEN` to pull).

Pull image manually:
```bash
echo $GHCR_TOKEN | docker login ghcr.io -u <username> --password-stdin
docker pull ghcr.io/<owner>/crewly-backend:latest
```

---

## Useful Docker Commands

```bash
# View running containers
docker compose -f docker-compose.prod.yml ps

# Tail backend logs
docker compose -f docker-compose.prod.yml logs -f backend

# Execute command in running container
docker compose -f docker-compose.prod.yml exec -T backend sh

# Run migration manually
docker compose -f docker-compose.prod.yml exec -T backend \
  ./node_modules/.bin/prisma migrate deploy

# Inspect database
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U crewly -d crewly -c "SELECT COUNT(*) FROM candidates;"

# Redis CLI
docker compose -f docker-compose.prod.yml exec -T redis redis-cli

# Force restart a service
docker compose -f docker-compose.prod.yml restart backend

# Check resource usage
docker stats
```
