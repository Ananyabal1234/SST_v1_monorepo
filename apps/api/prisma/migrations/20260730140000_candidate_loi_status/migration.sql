-- LOI status on candidates: offer only when NOT_APPLICABLE or RECEIVED.

CREATE TYPE "LoiStatus" AS ENUM ('NOT_APPLICABLE', 'RECEIVED', 'NOT_RECEIVED');

ALTER TABLE "candidates"
  ADD COLUMN "loi_status" "LoiStatus" NOT NULL DEFAULT 'NOT_RECEIVED';

-- Existing selected candidates that already have an offer: treat LOI as satisfied.
UPDATE "candidates" c
SET "loi_status" = 'NOT_APPLICABLE'
WHERE c."selected" = true
  AND EXISTS (
    SELECT 1 FROM "offers" o
    WHERE o."candidate_id" = c."id"
      AND o."deleted_at" IS NULL
  );

-- Selected without offer: keep default NOT_RECEIVED (awaiting LOI).
