#!/bin/sh
set -e
cd /app/apps/api

echo "[sst-api] Running prisma migrate deploy..."
pnpm exec prisma migrate deploy

# Optional first-boot admin when SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD are set.
# Skips if any ADMIN user already exists (SEED_FIRST_BOOT_ONLY). Never bakes passwords into the image.
if [ -n "${SEED_ADMIN_EMAIL:-}" ] && [ -n "${SEED_ADMIN_PASSWORD:-}" ]; then
  echo "[sst-api] Running optional first-boot seed (admin + lookups if no admin yet)..."
  SEED_FIRST_BOOT_ONLY=1 pnpm exec tsx prisma/seed.ts
else
  echo "[sst-api] SEED_ADMIN_* not set; skipping bootstrap (empty users until seed)."
fi

echo "[sst-api] Starting Nest API..."
# nest/tsc emits under dist/src when rootDir is apps/api (includes prisma/)
exec node dist/src/main.js
