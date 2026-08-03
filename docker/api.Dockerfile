# syntax=docker/dockerfile:1
# Build context: monorepo root
FROM node:22-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@11.11.0 --activate
WORKDIR /app

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-utils/package.json ./packages/shared-utils/
COPY packages/typescript-config ./packages/typescript-config/
RUN pnpm install --frozen-lockfile --filter @sst/api...
COPY apps/api ./apps/api
COPY packages/shared-types ./packages/shared-types
COPY packages/shared-utils ./packages/shared-utils
RUN pnpm --filter @sst/shared-types build \
  && pnpm --filter @sst/shared-utils build \
  && pnpm --filter @sst/api exec prisma generate \
  && pnpm --filter @sst/api build

FROM base AS production
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-utils/package.json ./packages/shared-utils/
COPY packages/typescript-config ./packages/typescript-config/
# Include prisma CLI (devDependency) for migrate deploy at startup
RUN pnpm install --frozen-lockfile --filter @sst/api...
COPY --from=build /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=build /app/packages/shared-utils/dist ./packages/shared-utils/dist
COPY --from=build /app/apps/api/dist ./apps/api/dist
# Ensure migrations/schema match the image build (already present from earlier COPY; refresh from build)
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
RUN pnpm --filter @sst/api exec prisma generate
COPY docker/api-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
WORKDIR /app/apps/api
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/entrypoint.sh"]
