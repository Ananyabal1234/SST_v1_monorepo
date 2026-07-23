# Migration & Backup Strategy — SST

## Purpose

Define how schema evolves and how data is protected locally.

## Audience

Backend, DevOps.

## Scope

Prisma Migrate + local backups. Cloud DR in `19-cloud` / `20-maintenance`.

## Definitions

| Term | Definition |
|------|------------|
| Migration | Versioned DDL |
| Seed | Deterministic sample/master data |

---

## 1. Migration workflow

```bash
pnpm --filter api prisma migrate dev --name <name>
pnpm --filter api prisma migrate deploy   # CI/prod-like
pnpm --filter api prisma generate
```

Rules:

- Never edit applied migrations.  
- Review generated SQL in PR.  
- Expand/contract for breaking changes.

## 2. Seed strategy

Seed:

1. Lookup values from Excel Setup Lists  
2. Admin user (password from env)  
3. Sample clients/job families  
4. Optional Excel sample requirements/candidates  

```bash
pnpm --filter api prisma db seed
```

## 3. Excel import migration

Separate from Prisma seed: Admin Import wizard maps CSV columns → entities with validation report (`FR-IMP-*`).

## 4. Backup (local)

| Cadence | Method |
|---------|--------|
| Daily | `pg_dump -Fc` to `./backups/` |
| Pre-migrate | Mandatory dump |

Restore:

```bash
pg_restore -d sst --clean --if-exists backup.dump
```

## 5. RPO/RTO (local targets)

| Metric | Target |
|--------|--------|
| RPO | ≤ 24h |
| RTO | ≤ 2h manual restore |

## References

- [PRISMA_DESIGN.md](./PRISMA_DESIGN.md)  
- [../17-local-deployment/SEED_AND_MIGRATION.md](../17-local-deployment/SEED_AND_MIGRATION.md)  
