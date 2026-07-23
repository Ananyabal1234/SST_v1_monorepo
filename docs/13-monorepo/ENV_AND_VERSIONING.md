# Environment & Versioning Strategy — SST

## Purpose

Standardize env files and versioning across packages.

## Audience

Developers, DevOps.

## Scope

Local + CI. Cloud secrets later.

## Definitions

| Term | Definition |
|------|------------|
| SemVer | MAJOR.MINOR.PATCH |
| CalVer | Not used |

---

## 1. Environment files

| File | Purpose |
|------|---------|
| `.env.example` | Documented keys, dummy values |
| `.env` | Local secrets (gitignored) |
| `apps/api/.env` | API-specific optional |
| `apps/web/.env` | `VITE_API_BASE_URL` |

### Required keys (example)

```bash
DATABASE_URL=postgresql://sst:sst@localhost:5432/sst?schema=public
JWT_ACCESS_SECRET=change-me-access-min-32-chars-long
JWT_REFRESH_SECRET=change-me-refresh-min-32-chars-long
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
PORT=3000
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=info
SEED_ADMIN_EMAIL=admin@sst.local
SEED_ADMIN_PASSWORD=ChangeMeNow!
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

## 2. Validation

API boots only if env schema validates; fail fast.

## 3. Versioning

- App version from root `package.json`  
- Releases tagged `vX.Y.Z`  
- OpenAPI `info.version` synced  
- Conventional Commits drive changelog  

## 4. Compatibility

Breaking API → bump MAJOR and `/api/v2` when needed. MVP stays `v1.x`.

## References

- 12-Factor Config  
- [../16-cicd/RELEASE_AND_ROLLBACK.md](../16-cicd/RELEASE_AND_ROLLBACK.md)  
