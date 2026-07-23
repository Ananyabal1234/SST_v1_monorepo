/*
  Warnings:

  - A unique constraint covering the columns `[candidate_id]` on the table `candidates` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "candidates" ADD COLUMN     "candidate_id" INTEGER,
ADD COLUMN     "job_family" TEXT,
ADD COLUMN     "position" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "candidates_candidate_id_key" ON "candidates"("candidate_id");
