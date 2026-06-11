#!/bin/sh
set -e

echo "[startup] Applying database migrations..."

if ./node_modules/.bin/prisma migrate deploy 2>&1; then
  echo "[startup] Migrations OK."
else
  echo "[startup] migrate deploy failed — attempting baseline (DB may have been created without migration history)..."
  for migration_dir in prisma/migrations/*/; do
    migration_name=$(basename "$migration_dir")
    ./node_modules/.bin/prisma migrate resolve --applied "$migration_name" 2>/dev/null \
      && echo "[startup] Baselined: $migration_name" || true
  done
  ./node_modules/.bin/prisma migrate deploy \
    && echo "[startup] Migrations OK after baseline." \
    || echo "[startup] WARNING: Migrations still failing. Manual intervention may be needed."
fi

echo "[startup] Running seed..."
node prisma/dist/seed.js || echo "[startup] WARNING: Seed failed (non-fatal)."

echo "[startup] Starting application..."
exec node dist/backend/src/main
