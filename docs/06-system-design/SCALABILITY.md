# Scalability Strategy — SST

## Purpose

Explain how SST scales from solo local use to multi-team load without premature complexity.

## Audience

Architects, platform engineers.

## Scope

MVP + near-term. Full cloud autoscaling in `19-cloud`.

## Definitions

| Term | Definition |
|------|------------|
| Vertical | Bigger single node |
| Horizontal | More API replicas |

---

## Growth stages

| Stage | Users | Strategy |
|-------|-------|----------|
| MVP | ≤25 | Single API + Postgres, good indexes |
| Team | ≤100 | 2+ API replicas behind reverse proxy; connection pool |
| Org | 100+ | Redis dashboard cache; Pg replicas; CDN for SPA |

## Application tactics

1. Stateless API (JWT; refresh in DB/Redis later).  
2. Pagination mandatory on lists.  
3. Dashboard SQL optimized; materialize later if slow.  
4. Avoid N+1 via Prisma `include` carefully.  
5. Background jobs later for import/notify (queue).

## Data tactics

See indexing doc. Partitioning not needed until millions of candidate rows.

## Redis (future-ready)

Interface: `CachePort` with `InMemoryCache` MVP adapter and `RedisCache` later for:

- Dashboard summary TTL 30–60s  
- Session/refresh token store  

## Trade-offs

Premature Redis adds ops cost; measure first (NFR thresholds).

## References

- [HIGH_LEVEL_ARCHITECTURE.md](./HIGH_LEVEL_ARCHITECTURE.md)  
- [../19-cloud/CLOUD_MIGRATION_PLAN.md](../19-cloud/CLOUD_MIGRATION_PLAN.md)  
