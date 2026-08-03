-- TA Lead assignees: join table (separate from TA owner shared pool)

CREATE TABLE "requirement_ta_lead_assignments" (
    "id" TEXT NOT NULL,
    "requirement_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "requirement_ta_lead_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "requirement_ta_lead_assignments_requirement_id_user_id_key"
  ON "requirement_ta_lead_assignments"("requirement_id", "user_id");

CREATE INDEX "requirement_ta_lead_assignments_user_id_idx"
  ON "requirement_ta_lead_assignments"("user_id");

ALTER TABLE "requirement_ta_lead_assignments"
  ADD CONSTRAINT "requirement_ta_lead_assignments_requirement_id_fkey"
  FOREIGN KEY ("requirement_id") REFERENCES "requirements"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "requirement_ta_lead_assignments"
  ADD CONSTRAINT "requirement_ta_lead_assignments_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
