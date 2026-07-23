# Indexing, Soft Delete & Audit — SST

## Purpose

Define index strategy, soft-delete behavior, and audit table design.

## Audience

DBAs, backend engineers.

## Scope

MVP PostgreSQL.

## Definitions

| Term | Definition |
|------|------------|
| Partial index | Index with WHERE clause |
| Soft delete | Row retained with `deleted_at` |

---

## 1. Index strategy

| Table | Index | Rationale |
|-------|-------|-----------|
| requirements | (status), (ta_owner_id), (sales_owner_id), (client_id), (requirement_date), (priority_code) | Filters + dashboard |
| candidates | (requirement_id), (mobile_normalized), (email_normalized), (selected), (stage_code) | Dup + pipeline |
| offers | (candidate_id unique where active), (status), (requirement_id) | Join paths |
| onboardings | (offer_id unique), (hr_owner_id), (status) | HR queues |
| audit_logs | (entity_type, entity_id), (actor_user_id), (created_at) | Query |
| users | (email), (role) | Auth |

Composite example for dashboard date+owner:

```sql
CREATE INDEX idx_req_owner_date ON requirements (ta_owner_id, requirement_date)
  WHERE deleted_at IS NULL;
```

## 2. Soft delete rules

- Default queries exclude `deleted_at IS NOT NULL`.  
- Unique constraints that must ignore deleted rows use partial unique indexes.  
- Cascade soft-delete is **not** automatic; deleting requirement blocked if active children unless Admin force.

## 3. Audit tables

`audit_logs` append-only. No updates/deletes in app layer.

Payload example:

```json
{
  "entityType": "Requirement",
  "entityId": "uuid",
  "action": "UPDATE",
  "before": { "status": "ACTIVE" },
  "after": { "status": "CANCELLED" }
}
```

## 4. Best practices

- Index selectivity first; avoid over-indexing writes.  
- `EXPLAIN ANALYZE` dashboard queries before MVP exit.  
- JSON audit columns `jsonb`.

## References

- [ER_AND_SCHEMA.md](./ER_AND_SCHEMA.md)  
- [../11-security/AUDIT_LOGGING.md](../11-security/AUDIT_LOGGING.md)  
