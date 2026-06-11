# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable pnpm

# ── install all deps (cached by lockfile) ────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY packages/types/package.json   ./packages/types/
COPY packages/prompts/package.json ./packages/prompts/
COPY backend/package.json         ./backend/
RUN printf 'packages:\n  - "packages/*"\n  - "backend"\noverrides:\n  vue-router: ^5.0.0\nallowBuilds:\n  "@nestjs/core": true\n  "@prisma/client": true\n  "@prisma/engines": true\n  "@scarf/scarf": true\n  argon2: true\n  msgpackr-extract: true\n  prisma: true\n  unrs-resolver: true\n' > pnpm-workspace.yaml
RUN --mount=type=cache,id=pnpm-backend,target=/pnpm/store \
    PRISMA_SKIP_POSTINSTALL_GENERATE=true pnpm install --frozen-lockfile

# ── compile ───────────────────────────────────────────────────────────────────
FROM deps AS builder
COPY packages/types   ./packages/types
COPY packages/prompts ./packages/prompts
COPY backend          ./backend
RUN ./backend/node_modules/.bin/tsc -p packages/prompts/tsconfig.build.json
RUN pnpm --filter backend exec prisma generate
RUN NODE_OPTIONS=--max-old-space-size=4096 pnpm --filter backend run build
RUN ./backend/node_modules/.bin/tsc \
    --module commonjs --target ES2022 --moduleResolution node \
    --esModuleInterop true --skipLibCheck \
    --rootDir backend/prisma --outDir backend/prisma/dist \
    backend/prisma/seed.ts

# ── prod-only deps ────────────────────────────────────────────────────────────
FROM base AS prod-deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY packages/types/package.json   ./packages/types/
COPY packages/prompts/package.json ./packages/prompts/
COPY backend/package.json         ./backend/
RUN printf 'packages:\n  - "packages/*"\n  - "backend"\noverrides:\n  vue-router: ^5.0.0\nallowBuilds:\n  "@nestjs/core": true\n  "@prisma/client": true\n  "@prisma/engines": true\n  "@scarf/scarf": true\n  argon2: true\n  msgpackr-extract: true\n  prisma: true\n  unrs-resolver: true\n' > pnpm-workspace.yaml
RUN --mount=type=cache,id=pnpm-backend,target=/pnpm/store \
    PRISMA_SKIP_POSTINSTALL_GENERATE=true pnpm install --prod --frozen-lockfile
COPY packages/types   ./packages/types
COPY packages/prompts ./packages/prompts
COPY backend/prisma ./backend/prisma
RUN pnpm --filter backend exec prisma generate

# ── runtime ───────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl wget
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable pnpm

COPY --from=prod-deps /app/node_modules           ./node_modules
COPY --from=prod-deps /app/backend/node_modules   ./backend/node_modules
COPY --from=prod-deps /app/packages/types         ./packages/types
COPY --from=prod-deps /app/packages/prompts       ./packages/prompts
COPY --from=builder   /app/packages/prompts/dist  ./packages/prompts/dist
COPY --from=prod-deps /app/backend/prisma         ./backend/prisma
COPY --from=builder  /app/backend/prisma/dist/seed.js ./backend/prisma/dist/seed.js
COPY package.json pnpm-lock.yaml ./
COPY packages/types/package.json   ./packages/types/
COPY packages/prompts/package.json ./packages/prompts/
COPY backend/package.json         ./backend/
RUN printf 'packages:\n  - "packages/*"\n  - "backend"\noverrides:\n  vue-router: ^5.0.0\nallowBuilds:\n  "@nestjs/core": true\n  "@prisma/client": true\n  "@prisma/engines": true\n  "@scarf/scarf": true\n  argon2: true\n  msgpackr-extract: true\n  prisma: true\n  unrs-resolver: true\n' > pnpm-workspace.yaml

COPY --from=builder /app/backend/dist ./backend/dist

EXPOSE 3000
WORKDIR /app/backend

RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
 && chown -R appuser:appgroup /app
USER appuser

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node prisma/dist/seed.js && node dist/backend/src/main"]
