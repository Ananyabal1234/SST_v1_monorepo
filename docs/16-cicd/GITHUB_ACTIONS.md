# GitHub Actions CI/CD — SST

## Purpose

Define CI workflows for build, test, lint, and image build.

## Audience

DevOps, engineers.

## Scope

MVP CI on GitHub Actions. Deploy-to-cloud Future.

## Definitions

| Workflow | Trigger |
|----------|---------|
| CI | PR + push main |
| Release | tag `v*` |

---

## 1. Workflow: `ci.yml`

Jobs:

1. **lint** — `pnpm lint`  
2. **typecheck** — `pnpm typecheck`  
3. **test** — unit + api integration (service Postgres)  
4. **build** — turbo build  

```yaml
# illustrative
name: CI
on:
  pull_request:
  push:
    branches: [main]
jobs:
  build-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: sst
          POSTGRES_PASSWORD: sst
          POSTGRES_DB: sst
        ports: ['5432:5432']
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
        env:
          DATABASE_URL: postgresql://sst:sst@localhost:5432/sst
          JWT_ACCESS_SECRET: ci-access-secret-min-32-characters
          JWT_REFRESH_SECRET: ci-refresh-secret-min-32-characters
      - run: pnpm build
```

## 2. Workflow: `docker.yml`

On main: build `api`/`web` images, tag `sha` + `latest` (push when registry configured).

## 3. Secrets / variables

| Name | Use |
|------|-----|
| (none required for basic CI) | secrets via env in job |
| `DOCKER_USERNAME` / `TOKEN` | Future registry |

## 4. Environment variables in CI

Match `.env.example` with ephemeral secrets.

## Lint pipeline

ESLint + Prettier check `--check`.

## Best practices

- Concurrency cancel outdated PR runs  
- Cache pnpm store  
- Fail on audit high (optional continue-on-error initially)  

## References

- [RELEASE_AND_ROLLBACK.md](./RELEASE_AND_ROLLBACK.md)  
- [../13-monorepo/ENV_AND_VERSIONING.md](../13-monorepo/ENV_AND_VERSIONING.md)  
