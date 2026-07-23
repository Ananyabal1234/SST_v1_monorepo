# Prisma Schema Design — SST

## Purpose

Specify Prisma models and generator conventions for `apps/api`.

## Audience

Backend engineers.

## Scope

Documented schema design (implementation applies later). MVP only.

## Definitions

| Term | Definition |
|------|------------|
| Prisma Client | Generated typed DB client |
| Migrate | Versioned SQL migrations |

---

## 1. File location

```text
apps/api/prisma/schema.prisma
apps/api/prisma/migrations/
apps/api/prisma/seed.ts
```

## 2. Generator / datasource

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

## 3. Enums

```prisma
enum Role {
  ADMIN
  SALES
  TA
  HR
  LEADERSHIP_READONLY
}

enum RequirementStatus {
  ACTIVE
  ON_HOLD
  CANCELLED
  CLOSED
}
```

Other status families may use lookup tables instead of enums for Setup Lists parity (preferred for Priority/Stage/Feedback/Offer/Onboarding/BGV).

## 4. Model sketch (illustrative)

```prisma
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String   @map("password_hash")
  fullName     String   @map("full_name")
  role         Role
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
  deletedAt    DateTime? @map("deleted_at")
  refreshTokens RefreshToken[]
  auditLogs    AuditLog[] @relation("ActorAudits")
  @@map("users")
}

model Requirement {
  id                 String   @id @default(uuid())
  publicId           String   @unique @map("public_id")
  requirementDate    DateTime @map("requirement_date") @db.Date
  clientId           String   @map("client_id")
  roleSkill          String   @map("role_skill")
  jobFamilyId        String   @map("job_family_id")
  numberOfPositions  Int      @map("number_of_positions")
  salesOwnerId       String   @map("sales_owner_id")
  taOwnerId          String?  @map("ta_owner_id")
  priorityCode       String   @map("priority_code")
  taHandoffDate      DateTime? @map("ta_handoff_date") @db.Date
  targetClosureDate  DateTime? @map("target_closure_date") @db.Date
  remarks            String?
  experience         String?
  jobLocation        String?  @map("job_location")
  minBudget          Decimal? @map("min_budget") @db.Decimal(14, 2)
  maxBudget          Decimal? @map("max_budget") @db.Decimal(14, 2)
  durationMonths     Int?     @map("duration_months")
  status             RequirementStatus @default(ACTIVE)
  legacyReqId        Int?     @map("legacy_req_id")
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")
  deletedAt          DateTime? @map("deleted_at")
  candidates         Candidate[]
  @@index([status])
  @@index([taOwnerId])
  @@index([salesOwnerId])
  @@index([clientId])
  @@index([requirementDate])
  @@map("requirements")
}

model Candidate {
  id                   String   @id @default(uuid())
  publicId             String   @unique @map("public_id")
  requirementId        String   @map("requirement_id")
  name                 String
  mobile               String
  mobileNormalized     String   @map("mobile_normalized")
  email                String
  emailNormalized      String   @map("email_normalized")
  source               String?
  stageCode            String   @map("stage_code")
  feedbackCode         String?  @map("feedback_code")
  profileSubmittedDate DateTime? @map("profile_submitted_date") @db.Date
  clientShortlistDate  DateTime? @map("client_shortlist_date") @db.Date
  interviewRound       String?  @map("interview_round")
  selected             Boolean  @default(false)
  selectedAt           DateTime? @map("selected_at")
  remarks              String?
  createdAt            DateTime @default(now()) @map("created_at")
  updatedAt            DateTime @updatedAt @map("updated_at")
  deletedAt            DateTime? @map("deleted_at")
  requirement          Requirement @relation(fields: [requirementId], references: [id])
  offer                Offer?
  @@index([requirementId])
  @@index([mobileNormalized])
  @@index([emailNormalized])
  @@index([selected])
  @@map("candidates")
}
```

`Offer`, `Onboarding`, `Client`, `JobFamily`, `Lookup*`, `AuditLog`, `RefreshToken` follow [ER_AND_SCHEMA.md](./ER_AND_SCHEMA.md).

## 5. Conventions

- `@map` snake_case columns  
- Soft delete filter via Prisma middleware or explicit `deletedAt: null`  
- Public IDs allocated in service layer transaction  

## 6. Example public ID allocation

```ts
await tx.idSequence.update({ where: { name: 'candidate' }, data: { value: { increment: 1 } } });
publicId = `CAN-${String(value).padStart(5, '0')}`;
```

## References

- Prisma docs  
- [MIGRATION_AND_BACKUP.md](./MIGRATION_AND_BACKUP.md)  
