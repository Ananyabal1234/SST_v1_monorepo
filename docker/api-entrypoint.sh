#!/bin/sh
set -e
cd /app/apps/api
echo "[sst-api] Running prisma migrate deploy..."
pnpm exec prisma migrate deploy
echo "[sst-api] Starting Nest API..."
# nest/tsc emits under dist/src when rootDir is apps/api (includes prisma/)
exec node dist/src/main.js
