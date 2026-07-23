# NestJS Architecture — SST API

## Purpose

Define NestJS folder structure, DI, and layering for `apps/api`.

## Audience

Backend engineers.

## Scope

MVP modular monolith.

## Definitions

| Term | Definition |
|------|------------|
| Module | Nest feature boundary |
| Provider | Injectable class |

---

## 1. Folder structure

```text
apps/api/src/
  main.ts
  app.module.ts
  config/
  common/
    filters/
    interceptors/
    pipes/
    guards/
    decorators/
    dto/
    logging/
  modules/
    auth/
    users/
    master-data/
    requirements/
    candidates/
    offers/
    onboarding/
    dashboard/
    audit/
    import/
    health/
  infrastructure/
    prisma/
    cache/          # InMemory port
    storage/        # Local disk port
```

## 2. Module template

```text
requirements/
  requirements.module.ts
  requirements.controller.ts
  requirements.service.ts          # application
  requirements.repository.ts
  domain/
    requirement.entity.ts          # optional pure types
    sla.calculator.ts
  dto/
    create-requirement.dto.ts
    update-requirement.dto.ts
    requirement-response.dto.ts
```

## 3. Dependency injection

- Prefer constructor injection.  
- Repositories wrap PrismaClient.  
- Domain calculators are pure/`@Injectable()` without Prisma when possible.

## 4. Patterns

| Pattern | Use |
|---------|-----|
| Repository | DB access isolation |
| Service | Use-cases / transactions |
| Guard | AuthZ + roles |
| Interceptor | Logging, transform, audit hook |
| Pipe | Validation (`ValidationPipe`) |
| Filter | `ProblemDetails` / error envelope |

## 5. Example main bootstrap

```ts
app.useLogger(app.get(Logger));
app.setGlobalPrefix('api/v1');
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
SwaggerModule.setup('api/docs', app, document);
```

## Trade-offs

CQRS not required for MVP; dashboard can live as dedicated query service.

## Implementation companion

For a beginner-friendly, codebase-driven walkthrough (actual file layout, Prisma patterns, auth, and full-stack feature recipes), see:

- [../21-guides/NESTJS_DEVELOPER_HANDBOOK.md](../21-guides/NESTJS_DEVELOPER_HANDBOOK.md)

**Note:** The folder structure below is aspirational. The current codebase uses flat feature folders directly under `apps/api/src/` (e.g. `requirements/`, `candidates/`). See the handbook for the real layout.

## References

- [../21-guides/NESTJS_DEVELOPER_HANDBOOK.md](../21-guides/NESTJS_DEVELOPER_HANDBOOK.md)  
- [MODULE_CATALOG.md](./MODULE_CATALOG.md)  
- [CROSS_CUTTING.md](./CROSS_CUTTING.md)  
