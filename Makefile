.PHONY: up down logs ps clean build pull deploy \
        dev-db dev-redis migrate seed

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
build:
	DOCKER_BUILDKIT=1 docker buildx build \
	  --file backend/Dockerfile  --tag my-hr/backend:local  . &
	DOCKER_BUILDKIT=1 docker buildx build \
	  --file frontend/Dockerfile --tag my-hr/frontend:local . &
	wait

pull:
	docker compose -f docker-compose.prod.yml pull

deploy:
	docker compose -f docker-compose.prod.yml up -d --no-build --remove-orphans

# ── Dev infra only (postgres + redis exposed on localhost) ────────────────────
dev-db:
	docker compose -f backend/docker-compose.yml up -d postgres

dev-redis:
	docker compose -f backend/docker-compose.yml up -d redis

# ── Database helpers ──────────────────────────────────────────────────────────
migrate:
	cd backend && pnpm exec prisma migrate dev

seed:
	cd backend && pnpm exec prisma db seed
