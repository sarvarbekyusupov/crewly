.PHONY: up down logs ps clean build pull deploy \
        dev-db dev-redis migrate seed \
        dev-infra dev-infra-stop dev-logs

# ── Local dev (builds images) ─────────────────────────────────────────────────
up:
	docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f

ps:
	docker compose ps

clean:
	docker compose down -v --remove-orphans

# ── Production (uses pre-built images via IMAGE_BACKEND / IMAGE_FRONTEND) ─────
# IMAGE_BACKEND and IMAGE_FRONTEND must be set — either export them or pass inline:
#   IMAGE_BACKEND=registry/crewly/backend:abc123 IMAGE_FRONTEND=registry/crewly/frontend:abc123 make deploy
build:
	DOCKER_BUILDKIT=1 docker buildx build \
	  --file backend/Dockerfile  --tag crewly/backend:local  . &
	DOCKER_BUILDKIT=1 docker buildx build \
	  --file frontend/Dockerfile --tag crewly/frontend:local . &
	wait

pull:
	@test -n "$(IMAGE_BACKEND)"  || (echo "ERROR: IMAGE_BACKEND not set"; exit 1)
	@test -n "$(IMAGE_FRONTEND)" || (echo "ERROR: IMAGE_FRONTEND not set"; exit 1)
	IMAGE_BACKEND=$(IMAGE_BACKEND) IMAGE_FRONTEND=$(IMAGE_FRONTEND) \
	  docker compose -f docker-compose.prod.yml --env-file .env.production pull

deploy:
	@test -n "$(IMAGE_BACKEND)"  || (echo "ERROR: IMAGE_BACKEND not set. Use: IMAGE_BACKEND=... IMAGE_FRONTEND=... make deploy"; exit 1)
	@test -n "$(IMAGE_FRONTEND)" || (echo "ERROR: IMAGE_FRONTEND not set. Use: IMAGE_BACKEND=... IMAGE_FRONTEND=... make deploy"; exit 1)
	IMAGE_BACKEND=$(IMAGE_BACKEND) IMAGE_FRONTEND=$(IMAGE_FRONTEND) \
	  docker compose -f docker-compose.prod.yml --env-file .env.production up -d --no-build --remove-orphans

migrate-prod:
	IMAGE_BACKEND=$(IMAGE_BACKEND) IMAGE_FRONTEND=$(IMAGE_FRONTEND) \
	  docker compose -f docker-compose.prod.yml --env-file .env.production \
	  run --rm backend pnpm exec prisma migrate deploy

# ── Fast local dev: infra only (postgres:5435 + redis:6379) ──────────────────
# 1. make dev-infra          — start postgres + redis
# 2. cd backend && pnpm run start:dev    — NestJS watch mode (auto-restart on save)
# 3. cd frontend && pnpm run dev         — Nuxt HMR (instant browser update)
#
# backend/.env needs:
#   DATABASE_URL=postgresql://crewly:crewly@localhost:5435/crewly
#   DIRECT_URL=postgresql://crewly:crewly@localhost:5435/crewly
#   REDIS_URL=redis://localhost:6379
dev-infra:
	docker compose -f docker-compose.dev.yml up -d

dev-infra-stop:
	docker compose -f docker-compose.dev.yml down

dev-logs:
	docker compose -f docker-compose.dev.yml logs -f

# ── Legacy: single-service infra (old creds, kept for compat) ────────────────
dev-db:
	docker compose -f backend/docker-compose.yml up -d postgres

dev-redis:
	docker compose -f backend/docker-compose.yml up -d redis

# ── Database helpers ──────────────────────────────────────────────────────────
migrate:
	cd backend && pnpm exec prisma migrate dev

seed:
	cd backend && pnpm exec prisma db seed
