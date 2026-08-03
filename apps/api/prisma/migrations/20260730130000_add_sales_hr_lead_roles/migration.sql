-- Add SALES_LEAD and HR_LEAD roles (parallel to TA_LEAD).

CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'SALES', 'SALES_LEAD', 'TA', 'TA_LEAD', 'HR', 'HR_LEAD');

ALTER TABLE "users"
  ALTER COLUMN "role" TYPE "Role_new"
  USING ("role"::text::"Role_new");

DROP TYPE "Role";

ALTER TYPE "Role_new" RENAME TO "Role";
