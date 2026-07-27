-- Remove LEADERSHIP_READONLY from Role enum.
-- Reassign any existing leadership users to ADMIN before dropping the value.

UPDATE "users"
SET "role" = 'ADMIN'
WHERE "role"::text = 'LEADERSHIP_READONLY';

CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'SALES', 'TA', 'HR');

ALTER TABLE "users"
  ALTER COLUMN "role" TYPE "Role_new"
  USING ("role"::text::"Role_new");

DROP TYPE "Role";

ALTER TYPE "Role_new" RENAME TO "Role";
