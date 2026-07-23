# OpenAPI Conventions — SST

## Purpose

Define how Swagger/OpenAPI is authored and maintained.

## Audience

Backend engineers.

## Scope

NestJS Swagger plugin / decorators for MVP.

## Definitions

| Term | Definition |
|------|------------|
| OpenAPI 3 | Spec format for Swagger UI |

---

## 1. Document metadata

```ts
new DocumentBuilder()
  .setTitle('Service Staffing Tracker API')
  .setDescription('MVP hiring pipeline API')
  .setVersion('1.0.0')
  .addBearerAuth()
  .build();
```

UI: `/api/docs`

## 2. Naming

- Tags = module names (`Requirements`, `Candidates`, …)  
- OperationIds = `methodResource` e.g. `createRequirement`  
- DTOs suffix `Dto`  

## 3. Decorator requirements

Every endpoint documents:

- Summary  
- Auth requirements  
- Request body schema  
- Response type + error codes 400/401/403/404/409  

## 4. Shared schemas package

Optionally export OpenAPI JSON in CI artifact `openapi.json` for frontend codegen.

## 5. Example

```ts
@ApiTags('Requirements')
@ApiBearerAuth()
@Post()
@Roles(Role.SALES, Role.ADMIN)
@ApiCreatedResponse({ type: RequirementResponseDto })
create(@Body() dto: CreateRequirementDto) { ... }
```

## Best practices

Keep DTO fields aligned with RTM; avoid silent field renames.

## References

- [API_CATALOG.md](./API_CATALOG.md)  
- NestJS Swagger docs  
