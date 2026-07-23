# Monorepo Structure — SST

## Purpose

Define Turborepo + pnpm workspace layout for a 100-person-ready codebase from day one.

## Audience

All engineers, platform.

## Scope

Repository structural standard for MVP (packages may start thin).

## Definitions

| Term | Definition |
|------|------------|
| Workspace package | pnpm package in `apps/` or `packages/` |
| Pipeline | turbo task graph |

---

## 1. Target tree

```text
/
├── apps/
│   ├── api/                 # NestJS
│   └── web/                 # Vite React
├── packages/
│   ├── shared-types/        # Zod schemas, DTO types, Role enums
│   ├── shared-utils/        # date/rag helpers usable both sides carefully
│   ├── eslint-config/
│   ├── typescript-config/
│   └── ui/                  # optional shadcn shared
├── docker/
│   ├── docker-compose.yml
│   ├── prometheus/
│   ├── grafana/
│   └── loki/
├── docs/                    # this documentation
├── .github/workflows/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── .env.example
```

## 2. pnpm-workspace.yaml

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

## 3. turbo.json (sketch)

```json
{
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "lint": {},
    "typecheck": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["^build"] },
    "dev": { "cache": false, "persistent": true }
  }
}
```

## 4. Package naming

`@sst/api`, `@sst/web`, `@sst/shared-types`, `@sst/eslint-config`, …

## 5. Build strategy

- `shared-types` built/transpiled before dependents  
- API `prisma generate` in `postinstall` or turbo prep task  
- Web builds static assets  

## Best practices

- No circular package deps  
- Apps do not import other apps  
- Domain logic not in `ui` package  

## References

- [PACKAGES_AND_SHARED_LIBS.md](./PACKAGES_AND_SHARED_LIBS.md)  
- [ENV_AND_VERSIONING.md](./ENV_AND_VERSIONING.md)  
- Turborepo handbook  
