# Errors, Pagination, Filtering & Sorting — SST API

## Purpose

Standardize cross-endpoint query and error contracts.

## Audience

API consumers and implementers.

## Scope

MVP list endpoints.

## Definitions

| Term | Definition |
|------|------------|
| page | 1-based page index |
| pageSize | Items per page (default 25, max 100) |

---

## 1. Pagination response

```json
{
  "items": [ ],
  "page": 1,
  "pageSize": 25,
  "totalItems": 128,
  "totalPages": 6
}
```

## 2. Filtering

| Param | Type | Notes |
|-------|------|-------|
| `q` | string | Search name/role/publicId |
| `status` | string | |
| `from` / `to` | ISO date | Inclusive on requirementDate or createdAt per resource |
| `taOwnerId` | uuid | |
| `salesOwnerId` | uuid | |
| `clientId` | uuid | |
| `jobFamilyId` | uuid | |
| `priorityCode` | string | |
| `requirementId` | uuid | Candidates/offers |

Unknown filter keys → 400.

## 3. Sorting

`sort=field:asc|desc`  
Allowlist per resource e.g. requirements: `requirementDate`, `priorityCode`, `createdAt`, `publicId`.

Default: `createdAt:desc`.

## 4. Error responses

| Code | When |
|------|------|
| 400 | Validation / bad query |
| 401 | Missing/invalid token |
| 403 | Role insufficient |
| 404 | Entity missing |
| 409 | Conflict (ineligible offer, unique) |
| 429 | Rate limit login |
| 500 | Unexpected |

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "Candidate is not selected",
  "correlationId": "b7c2..."
}
```

## 5. Idempotency

Import commit accepts `Idempotency-Key` header (Should).

## References

- RFC 7807 inspiration (simplified envelope)  
- [API_CATALOG.md](./API_CATALOG.md)  
