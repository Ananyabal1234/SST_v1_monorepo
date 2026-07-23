# Release & Rollback Strategy — SST

## Purpose

Define how versions ship and how to roll back safely (local/container first).

## Audience

DevOps, EM.

## Scope

MVP container releases. Cloud cutover later.

## Definitions

| Term | Definition |
|------|------------|
| Release | Tagged immutable version |
| Rollback | Redeploy previous image + migrate down if safe |

---

## 1. Versioning

SemVer tags `v1.0.0`. Changelog from Conventional Commits.

## 2. Release steps

1. CI green on main  
2. Tag `vX.Y.Z`  
3. Build images `sst-api:X.Y.Z`, `sst-web:X.Y.Z`  
4. Compose pull/up on target host  
5. `prisma migrate deploy`  
6. Smoke `/health` + login  

## 3. Database rollback

- Prefer forward-fix migrations  
- Down migrations only if tested; restore from `pg_dump` if unsafe  

## 4. App rollback

```bash
# pin previous tags in compose override
docker compose up -d
```

## 5. Release checklist

- [ ] Migrations reviewed  
- [ ] Seed not destructive in prod-like  
- [ ] Metrics dashboards still scraping  
- [ ] Audit still writing  

## References

- [GITHUB_ACTIONS.md](./GITHUB_ACTIONS.md)  
- [../07-database/MIGRATION_AND_BACKUP.md](../07-database/MIGRATION_AND_BACKUP.md)  
