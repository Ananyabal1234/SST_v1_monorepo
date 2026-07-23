# Cross-Cutting Concerns — NestJS API

## Purpose

Specify guards, interceptors, pipes, filters, logging, config, validation, Swagger.

## Audience

Backend engineers.

## Scope

MVP API cross-cutting.

## Definitions

| Concern | Nest mechanism |
|---------|----------------|
| AuthN | Passport JWT Guard |
| AuthZ | RolesGuard |
| Validation | ValidationPipe + DTOs |
| Errors | Exception Filter |

---

## 1. Configuration

`@nestjs/config` with Joi/Zod schema:

| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | Postgres |
| `JWT_ACCESS_SECRET` | Access signing |
| `JWT_REFRESH_SECRET` | Refresh signing |
| `JWT_ACCESS_TTL` | e.g. 15m |
| `JWT_REFRESH_TTL` | e.g. 7d |
| `PORT` | 3000 |
| `CORS_ORIGIN` | Web origin |
| `LOG_LEVEL` | info |

## 2. Guards

- `JwtAuthGuard` — default global; `@Public()` for login/health.  
- `RolesGuard` — `@Roles(Role.ADMIN, Role.SALES)`.  

## 3. Interceptors

- `LoggingInterceptor` — method, path, duration, correlationId.  
- `TransformInterceptor` — optional envelope `{ data }` (pick one style and stick).  
- Prefer Problem Details for errors; success can be raw DTO.

## 4. Pipes

- Global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`.  
- ParseUUIDPipe on `:id` params.

## 5. Exception handling

Map domain errors:

| Error | HTTP |
|-------|------|
| NotFound | 404 |
| Conflict (duplicate offer) | 409 |
| Forbidden | 403 |
| Validation | 400 |
| Unauthenticated | 401 |

Body shape:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": ["roleSkill should not be empty"],
  "correlationId": "..."
}
```

## 6. Logging (Pino)

- JSON logs  
- Redact `password`, `authorization`, `mobile`, `email`  
- Bind `correlationId` from `x-correlation-id` or generate  

## 7. Swagger

- Bearer JWT security scheme  
- Tags per module  
- DTO schemas from class-validator  

## 8. Middleware

- Helmet  
- Compression optional  
- Raw body not needed MVP  

## Best practices

Keep business rules out of controllers; controllers thin.

## References

- NestJS docs  
- [../11-security/AUTH_RBAC.md](../11-security/AUTH_RBAC.md)  
- [../18-monitoring/OBSERVABILITY.md](../18-monitoring/OBSERVABILITY.md)  
