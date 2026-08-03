-- Add TA_LEAD to Role enum for Sales → TA Lead → TA assignment workflow.

CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'SALES', 'TA', 'TA_LEAD', 'HR');

ALTER TABLE "users"
  ALTER COLUMN "role" TYPE "Role_new"
  USING ("role"::text::"Role_new");

DROP TYPE "Role";

ALTER TYPE "Role_new" RENAME TO "Role";
