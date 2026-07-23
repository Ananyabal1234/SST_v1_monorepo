# API Catalog — SST REST API

## Purpose

Normative endpoint catalog for MVP `/api/v1`.

## Audience

Backend, frontend, QA.

## Scope

MVP resources. Workforce endpoints Future.

## Definitions

| Term | Definition |
|------|------------|
| publicId | Business id e.g. `REQ-00001` |
| UUID | Internal path id unless noted |

Base URL: `http://localhost:3000/api/v1`  
Auth: `Authorization: Bearer <accessToken>` unless Public.

---

## Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | Public | `{ email, password }` → tokens + user |
| POST | `/auth/refresh` | Cookie/body | New access token |
| POST | `/auth/logout` | Auth | Revoke refresh |
| GET | `/auth/me` | Auth | Current user |

### Login request/response

```json
// request
{ "email": "admin@example.com", "password": "********" }
// response 200
{
  "accessToken": "eyJ...",
  "user": { "id": "...", "email": "...", "fullName": "...", "role": "ADMIN" }
}
```

---

## Users (Admin)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/users` | ADMIN | Paginated users |
| POST | `/users` | ADMIN | Create |
| PATCH | `/users/:id` | ADMIN | Update role/active |
| POST | `/users/:id/reset-password` | ADMIN | Set temp password |

---

## Master data

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/master-data/lookups/:type` | Auth | List values |
| POST | `/master-data/lookups/:type` | ADMIN | Create |
| PATCH | `/master-data/lookups/:type/:id` | ADMIN | Update |
| GET/POST/PATCH | `/master-data/clients` | GET Auth; mutate ADMIN/SALES | Clients |
| GET/POST/PATCH | `/master-data/job-families` | GET Auth; mutate ADMIN | Job families |

`type` ∈ `PRIORITY|CANDIDATE_STAGE|FEEDBACK|OFFER_STATUS|ONBOARDING_STATUS|BGV_STATUS|REQUIREMENT_STATUS`

---

## Requirements

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/requirements` | SALES,TA,ADMIN,LEADERSHIP | List + filters |
| GET | `/requirements/:id` | same | Detail + derived SLA/open/closed (`:id` = UUID or `REQ-#####`) |
| POST | `/requirements` | SALES,ADMIN | Create — server allocates `id` + `publicId` |
| PATCH | `/requirements/:id` | SALES,ADMIN,TA(limited) | Update |
| POST | `/requirements/:id/status` | SALES,ADMIN | Status transition |

### Create request

```json
{
  "requirementDate": "2026-07-07",
  "clientId": "uuid",
  "roleSkill": "Core Python Developer",
  "jobFamilyId": "uuid",
  "numberOfPositions": 5,
  "salesOwnerId": "uuid",
  "priorityCode": "HIGH",
  "taOwnerId": "uuid",
  "taHandoffDate": "2026-07-07",
  "targetClosureDate": "2026-07-09",
  "minBudget": 1000000,
  "maxBudget": 1500000,
  "durationMonths": 12,
  "jobLocation": "Bangalore",
  "experience": "5+ years",
  "remarks": null
}
```

### Create response (key identity fields)

```json
{
  "id": "uuid",
  "publicId": "REQ-00014",
  "status": "ACTIVE",
  "clientId": "uuid",
  "roleSkill": "Core Python Developer",
  "numberOfPositions": 5,
  "requirementAgeDays": 0,
  "taHandoffSlaRag": "GREEN",
  "openPositions": 5,
  "closedPositions": 0
}
```

Filters: `taOwnerId`, `salesOwnerId`, `priorityCode`, `clientId`, `jobFamilyId`, `status`, `from`, `to`, `q`, `page`, `pageSize`, `sort`

---

## Candidates

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/candidates` | TA,SALES,ADMIN,LEADERSHIP | List |
| GET | `/candidates/:id` | same | Detail + duplicate flags (`:id` = UUID or `CAN-#####`) |
| POST | `/candidates` | TA,ADMIN | Create — links to parent requirement |
| PATCH | `/candidates/:id` | TA,ADMIN | Update |
| POST | `/candidates/:id/select` | TA,ADMIN | `{ selected: true\|false }` |

### Create request

```json
{
  "requirementId": "<requirement.id UUID from POST /requirements>",
  "name": "Yogesh kumar",
  "mobile": "8527172822",
  "email": "yogeshsingh1996@gmail.com",
  "source": "Referral",
  "position": "Core Python Developer",
  "jobFamily": "Application Development",
  "stageCode": "SUBMITTED_TO_SPOC",
  "feedbackCode": "PENDING",
  "profileSubmittedDate": "2026-07-10"
}
```

### Create response (key identity fields)

```json
{
  "id": "uuid",
  "publicId": "CAN-00012",
  "requirementId": "uuid",
  "stageCode": "SUBMITTED_TO_SPOC",
  "feedbackCode": "PENDING",
  "selected": false,
  "requirement": {
    "id": "uuid",
    "publicId": "REQ-00014",
    "roleSkill": "Core Python Developer"
  },
  "duplicateMobile": false,
  "duplicateEmail": false
}
```

### Select request / response

```json
// POST /candidates/:id/select
{ "selected": true }
// response includes same identity fields with selected: true, selectedAt: "..."
```

---

## Offers

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/offers` | HR,TA,ADMIN,LEADERSHIP | List (includes offer `id` + `publicId`) |
| GET | `/offers/:id` | same | Detail (`:id` = UUID or `OFF-#####`) |
| POST | `/offers` | HR,TA,ADMIN | Create for **selected** candidate; copies `requirementId` |
| PATCH | `/offers/:id` | HR,ADMIN | Update dates/CTC |
| POST | `/offers/:id/status` | HR,ADMIN | Status transition (e.g. `ACCEPTED`) |

### Create request

```json
{
  "candidateId": "<candidate.id UUID>",
  "offerInitiatedDate": "2026-07-12",
  "offerReleasedDate": "2026-07-13",
  "statusCode": "RELEASED",
  "ctcRate": "18 LPA",
  "expectedDoj": "2026-08-01",
  "remarks": null
}
```

### Create / list / get response (key identity fields)

```json
{
  "id": "uuid",
  "publicId": "OFF-00005",
  "candidateId": "uuid",
  "requirementId": "uuid",
  "statusCode": "RELEASED",
  "candidate": {
    "id": "uuid",
    "publicId": "CAN-00012",
    "name": "Yogesh kumar"
  },
  "requirement": {
    "id": "uuid",
    "publicId": "REQ-00014",
    "roleSkill": "Core Python Developer"
  }
}
```

Accept before onboarding:

```json
// POST /offers/:id/status
{ "statusCode": "ACCEPTED" }
```

---

## Onboardings

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/onboardings` | HR,ADMIN,LEADERSHIP | List |
| GET | `/onboardings/:id` | same | Detail (`:id` = UUID or `ONB-#####`) |
| POST | `/onboardings` | HR,ADMIN | From **ACCEPTED** offer — copies `candidateId` + `requirementId` |
| PATCH | `/onboardings/:id` | HR,ADMIN | Update |
| POST | `/onboardings/:id/status` | HR,ADMIN | Status / Joined |

### Create request

```json
{
  "offerId": "<offer.id UUID after ACCEPTED>",
  "hrOwnerId": "uuid",
  "docsPending": true,
  "bgvStatusCode": "NOT_STARTED",
  "joiningFormalities": "",
  "expectedDoj": "2026-08-01"
}
```

### Create response (full ID chain)

```json
{
  "id": "uuid",
  "publicId": "ONB-00003",
  "onboardingId": "ONB-00003",
  "offerId": "uuid",
  "offerPublicId": "OFF-00005",
  "candidateId": "uuid",
  "candidatePublicId": "CAN-00012",
  "candidateCode": "CAN-00012",
  "requirementId": "uuid",
  "requirementPublicId": "REQ-00014",
  "reqId": "REQ-00014",
  "onboardingStatus": "IN_PROGRESS",
  "offerStatus": "ACCEPTED"
}
```

---

## ID chain (Sales → TA → HR)

```text
POST /requirements                 → id + publicId REQ-#####
POST /candidates { requirementId } → id + publicId CAN-##### (FK requirementId)
POST /candidates/:id/select        → selected=true
POST /offers { candidateId }       → id + publicId OFF-##### (FK candidateId + requirementId)
POST /offers/:id/status ACCEPTED
POST /onboardings { offerId }      → id + publicId ONB-##### (FK offerId + candidateId + requirementId)
```

Clients never send `publicId` on create. Path `:id` accepts UUID **or** publicId (`REQ-` / `CAN-` / `OFF-` / `ONB-`).

---

## Dashboard

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| POST | `/dashboard` | Auth | **Single** dashboard API: KPIs, breakdowns, escalations, RAG summary, positions by client |

Send filters in the **JSON body** (omit a key or use `{}` for all data):

| Body key | Type | Description |
|----------|------|-------------|
| `taOwnerId` | uuid | Filter by TA owner |
| `salesOwnerId` | uuid | Filter by sales owner |
| `clientId` | uuid | Filter by client |
| `jobFamilyId` | uuid | Filter by job family |
| `priorityCode` | string | e.g. `HIGH` |
| `from` | date | Requirement date from (`YYYY-MM-DD`) |
| `to` | date | Requirement date to (`YYYY-MM-DD`) |

Response sections: `summary`, `breakdowns`, `escalations`, `requirementRagSummary`, `openPositionsOnClient`, `closedPositionsOnClient`, `lists`.

`lists` contains full data (not only counts):
- `filters` — `taOwners`, `salesOwners`, `clients`, `jobFamilies`, `priorities`
- KPI detail arrays — `requirements`, `pendingSalesHandoff`, `candidatesInPipeline`, `selectedCandidates`, `offersReleased`, `offersAccepted`, `offersRejected`, `candidatesJoined`, `cancelledRequirements`, `requirementsAtRisk`

Offer funnel KPIs are **current-stage buckets** (not cumulative):
- `offersReleased` — status `RELEASED` only
- `offersAccepted` — status `ACCEPTED` and not yet `JOINED`
- `candidatesJoined` — onboardings with status `JOINED`
- `selectedCandidates` — selected and not yet `JOINED`

### Summary section (example)

```json
{
  "totalRequirements": 8,
  "totalPositions": 17,
  "openPositions": 16,
  "closedPositions": 1,
  "pendingSalesHandoff": 0,
  "candidatesInPipeline": 5,
  "selectedCandidates": 1,
  "duplicateMobiles": 0,
  "offersReleased": 0,
  "offersAccepted": 0,
  "candidatesJoined": 0,
  "fillRate": 0.0588
}
```

---

## Audit / Import / Health

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/audit-logs` | ADMIN | Filtered audit |
| POST | `/imports/validate` | ADMIN | Upload CSV validate |
| POST | `/imports/commit` | ADMIN | Commit import |
| GET | `/health` | Public | Liveness |
| GET | `/ready` | Public | DB readiness |
| GET | `/metrics` | Internal | Prometheus |

## Versioning

URI version `/api/v1`. Breaking changes → `/api/v2`.

## References

- [OPENAPI_CONVENTIONS.md](./OPENAPI_CONVENTIONS.md)  
- [ERRORS_PAGINATION_FILTERING.md](./ERRORS_PAGINATION_FILTERING.md)  
- [../01-business-analysis/REQUIREMENT_TRACEABILITY_MATRIX.md](../01-business-analysis/REQUIREMENT_TRACEABILITY_MATRIX.md)  
