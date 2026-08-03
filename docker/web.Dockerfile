# syntax=docker/dockerfile:1
# Build context: monorepo root
FROM node:22-bookworm-slim AS build
RUN corepack enable && corepack prepare pnpm@11.11.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/RecuirementDashboard/package.json ./apps/RecuirementDashboard/
RUN pnpm install --frozen-lockfile --filter recruitment-dashboard...
COPY apps/RecuirementDashboard ./apps/RecuirementDashboard
RUN pnpm --filter recruitment-dashboard build

FROM nginx:1.27-alpine AS production
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/RecuirementDashboard/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
