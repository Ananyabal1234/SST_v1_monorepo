-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SALES', 'TA', 'HR', 'LEADERSHIP_READONLY');

-- CreateEnum
CREATE TYPE "RequirementStatus" AS ENUM ('ACTIVE', 'ON_HOLD', 'CANCELLED', 'CLOSED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_normalized" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_families" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "job_families_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lookup_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lookup_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lookup_values" (
    "id" TEXT NOT NULL,
    "lookup_type_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lookup_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirements" (
    "id" TEXT NOT NULL,
    "public_id" TEXT NOT NULL,
    "requirement_date" DATE NOT NULL,
    "client_id" TEXT NOT NULL,
    "role_skill" TEXT NOT NULL,
    "job_family_id" TEXT NOT NULL,
    "number_of_positions" INTEGER NOT NULL,
    "sales_owner_id" TEXT NOT NULL,
    "ta_owner_id" TEXT,
    "priority_code" TEXT NOT NULL,
    "ta_handoff_date" DATE,
    "target_closure_date" DATE,
    "remarks" TEXT,
    "experience" TEXT,
    "job_location" TEXT,
    "min_budget" DECIMAL(14,2),
    "max_budget" DECIMAL(14,2),
    "duration_months" INTEGER,
    "status" "RequirementStatus" NOT NULL DEFAULT 'ACTIVE',
    "legacy_req_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL,
    "public_id" TEXT NOT NULL,
    "requirement_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "mobile_normalized" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_normalized" TEXT NOT NULL,
    "source" TEXT,
    "stage_code" TEXT NOT NULL,
    "feedback_code" TEXT,
    "profile_submitted_date" DATE,
    "client_shortlist_date" DATE,
    "interview_round" TEXT,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "selected_at" TIMESTAMP(3),
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "public_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "requirement_id" TEXT NOT NULL,
    "offer_initiated_date" DATE,
    "offer_released_date" DATE,
    "status_code" TEXT NOT NULL,
    "ctc_rate" TEXT,
    "expected_doj" DATE,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboardings" (
    "id" TEXT NOT NULL,
    "public_id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "requirement_id" TEXT NOT NULL,
    "hr_owner_id" TEXT NOT NULL,
    "docs_pending" BOOLEAN NOT NULL DEFAULT true,
    "bgv_status_code" TEXT NOT NULL,
    "joining_formalities" TEXT,
    "expected_doj" DATE,
    "actual_doj" DATE,
    "status_code" TEXT NOT NULL,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "onboardings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "before_json" JSONB,
    "after_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "id_sequences" (
    "name" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "id_sequences_pkey" PRIMARY KEY ("name")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "clients_name_normalized_key" ON "clients"("name_normalized");

-- CreateIndex
CREATE UNIQUE INDEX "job_families_name_key" ON "job_families"("name");

-- CreateIndex
CREATE UNIQUE INDEX "lookup_types_code_key" ON "lookup_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "lookup_values_lookup_type_id_code_key" ON "lookup_values"("lookup_type_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "requirements_public_id_key" ON "requirements"("public_id");

-- CreateIndex
CREATE INDEX "requirements_status_idx" ON "requirements"("status");

-- CreateIndex
CREATE INDEX "requirements_ta_owner_id_idx" ON "requirements"("ta_owner_id");

-- CreateIndex
CREATE INDEX "requirements_sales_owner_id_idx" ON "requirements"("sales_owner_id");

-- CreateIndex
CREATE INDEX "requirements_client_id_idx" ON "requirements"("client_id");

-- CreateIndex
CREATE INDEX "requirements_requirement_date_idx" ON "requirements"("requirement_date");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_public_id_key" ON "candidates"("public_id");

-- CreateIndex
CREATE INDEX "candidates_requirement_id_idx" ON "candidates"("requirement_id");

-- CreateIndex
CREATE INDEX "candidates_mobile_normalized_idx" ON "candidates"("mobile_normalized");

-- CreateIndex
CREATE INDEX "candidates_email_normalized_idx" ON "candidates"("email_normalized");

-- CreateIndex
CREATE INDEX "candidates_selected_idx" ON "candidates"("selected");

-- CreateIndex
CREATE UNIQUE INDEX "offers_public_id_key" ON "offers"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "offers_candidate_id_key" ON "offers"("candidate_id");

-- CreateIndex
CREATE INDEX "offers_requirement_id_idx" ON "offers"("requirement_id");

-- CreateIndex
CREATE INDEX "offers_status_code_idx" ON "offers"("status_code");

-- CreateIndex
CREATE UNIQUE INDEX "onboardings_public_id_key" ON "onboardings"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "onboardings_offer_id_key" ON "onboardings"("offer_id");

-- CreateIndex
CREATE UNIQUE INDEX "onboardings_candidate_id_key" ON "onboardings"("candidate_id");

-- CreateIndex
CREATE INDEX "onboardings_requirement_id_idx" ON "onboardings"("requirement_id");

-- CreateIndex
CREATE INDEX "onboardings_status_code_idx" ON "onboardings"("status_code");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_idx" ON "audit_logs"("actor_user_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lookup_values" ADD CONSTRAINT "lookup_values_lookup_type_id_fkey" FOREIGN KEY ("lookup_type_id") REFERENCES "lookup_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_job_family_id_fkey" FOREIGN KEY ("job_family_id") REFERENCES "job_families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_sales_owner_id_fkey" FOREIGN KEY ("sales_owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirements" ADD CONSTRAINT "requirements_ta_owner_id_fkey" FOREIGN KEY ("ta_owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "requirements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "requirements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboardings" ADD CONSTRAINT "onboardings_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboardings" ADD CONSTRAINT "onboardings_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboardings" ADD CONSTRAINT "onboardings_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "requirements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboardings" ADD CONSTRAINT "onboardings_hr_owner_id_fkey" FOREIGN KEY ("hr_owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
