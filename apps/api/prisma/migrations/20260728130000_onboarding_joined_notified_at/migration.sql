-- AlterTable
ALTER TABLE "onboardings" ADD COLUMN "joined_notified_at" TIMESTAMP(3);

-- Backfill: already-joined rows should not re-notify on status bounce
UPDATE "onboardings"
SET "joined_notified_at" = COALESCE("actual_doj"::timestamp, "updated_at", NOW())
WHERE "status_code" IN ('JOINED', 'COMPLETED')
  AND "joined_notified_at" IS NULL
  AND "deleted_at" IS NULL;
