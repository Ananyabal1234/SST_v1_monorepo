-- Multi-TA shared pool: join table + backfill from legacy ta_owner_id

CREATE TABLE "requirement_ta_assignments" (
    "id" TEXT NOT NULL,
    "requirement_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "requirement_ta_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "requirement_ta_assignments_requirement_id_user_id_key"
  ON "requirement_ta_assignments"("requirement_id", "user_id");

CREATE INDEX "requirement_ta_assignments_user_id_idx"
  ON "requirement_ta_assignments"("user_id");

ALTER TABLE "requirement_ta_assignments"
  ADD CONSTRAINT "requirement_ta_assignments_requirement_id_fkey"
  FOREIGN KEY ("requirement_id") REFERENCES "requirements"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "requirement_ta_assignments"
  ADD CONSTRAINT "requirement_ta_assignments_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "requirement_ta_assignments" ("id", "requirement_id", "user_id", "is_primary", "assigned_at")
SELECT gen_random_uuid()::text, r."id", r."ta_owner_id", true, CURRENT_TIMESTAMP
FROM "requirements" r
WHERE r."ta_owner_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "requirement_ta_assignments" a
    WHERE a."requirement_id" = r."id" AND a."user_id" = r."ta_owner_id"
  );
