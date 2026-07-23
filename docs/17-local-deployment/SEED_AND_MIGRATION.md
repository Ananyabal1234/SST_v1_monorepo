# Seed & Migration — Local — SST

## Purpose

Operational steps for schema migrate and seed aligned with Excel masters.

## Audience

Developers.

## Scope

Local/dev environments.

## Definitions

| Command | Tool |
|---------|------|
| migrate | Prisma |
| seed | `prisma/seed.ts` |

---

## Migrations

```bash
pnpm --filter api prisma migrate dev --name init
pnpm --filter api prisma migrate deploy
```

Reset (destructive):

```bash
pnpm --filter api prisma migrate reset
```

## Seed contents (required)

1. Lookup values from Excel Setup Lists: Priority, Candidate Stage, Feedback, Offer Status, Onboarding Status, BGV Status, Requirement Status, YesNo  
2. Admin user  
3. Sample Sales/TA/HR users  
4. Clients: e.g. Xebia, Birlasoft, Infosys (normalized)  
5. Job family `tech`  
6. Optional sample requirements/candidates/offers mirroring Excel sample  

## Excel CSV import

After seed, Admin Import can load fuller history. Validate → commit.

## Verification queries

```sql
SELECT count(*) FROM lookup_values;
SELECT email, role FROM users;
SELECT public_id, role_skill FROM requirements;
```

## References

- [../07-database/MIGRATION_AND_BACKUP.md](../07-database/MIGRATION_AND_BACKUP.md)  
- Excel Setup Lists sheet  
