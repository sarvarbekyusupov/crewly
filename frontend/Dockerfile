# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable pnpm

# ── install deps ──────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY packages/types/package.json  ./packages/types/
COPY frontend/package.json        ./frontend/
RUN printf 'packages:\n  - "packages/*"\n  - "frontend"\noverrides:\n  vue-router: ^5.0.0\nallowBuilds:\n  "@parcel/watcher": true\n  esbuild: true\n  vue-demi: true\n  "@sentry/cli": true\n  unrs-resolver: true\n  sharp: true\n' > pnpm-workspace.yaml
RUN --mount=type=cache,id=pnpm-frontend,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ── build ─────────────────────────────────────────────────────────────────────
FROM deps AS builder
ARG NUXT_PUBLIC_API_BASE=http://localhost:3030
ARG NUXT_PUBLIC_WAITLIST_MODE=false
ENV NUXT_PUBLIC_API_BASE=$NUXT_PUBLIC_API_BASE
ENV NUXT_PUBLIC_WAITLIST_MODE=$NUXT_PUBLIC_WAITLIST_MODE
ENV NODE_ENV=production

COPY packages/types ./packages/types
COPY frontend        ./frontend
RUN pnpm --filter crewly-frontend run build

# ── runtime ───────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

COPY --from=builder /app/frontend/.output ./.output

EXPOSE 3000
ENV NITRO_PORT=3000
ENV NODE_ENV=production

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["node", ".output/server/index.mjs"]
