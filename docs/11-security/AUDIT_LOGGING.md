# Audit Logging — SST

## Purpose

Specify what is audited, how it is stored, and how it is queried.

## Audience

Backend, security, compliance.

## Scope

MVP append-only audit trail.

## Definitions

| Action | Meaning |
|--------|---------|
| CREATE | Insert |
| UPDATE | Field changes |
| STATUS | Status transition |
| LOGIN_SUCCESS / LOGIN_FAILURE | Auth events |
| IMPORT | Batch import |

---

## 1. What to audit (Must)

- Requirement create/update/status  
- Candidate create/update/select  
- Offer create/update/status  
- Onboarding create/update/status  
- User create/role/active changes  
- Master data mutations  
- Import commit  
- Auth login success/failure (no password)

## 2. Record schema

| Field | Type |
|-------|------|
| id | uuid |
| entityType | string |
| entityId | uuid/string |
| action | string |
| actorUserId | uuid nullable (system) |
| beforeJson | jsonb |
| afterJson | jsonb |
| ip | string nullable |
| correlationId | string |
| createdAt | timestamptz |

## 3. Implementation pattern

Call `AuditService.record` inside DB transaction after successful mutation.

## 4. Query API

`GET /audit-logs?entityType=&entityId=&actorUserId=&from=&to=&page=`

Admin only.

## 5. Retention

Default 24 months (configurable). Soft archive Future.

## Best practices

- Do not store secrets in JSON  
- Truncate overly large payloads  
- Prefer field-level diffs for UPDATE  

## References

- [../07-database/INDEXING_AND_AUDIT.md](../07-database/INDEXING_AND_AUDIT.md)  
- FR-AUD-*  
