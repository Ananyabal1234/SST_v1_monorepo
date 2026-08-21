-- AlterTable
ALTER TABLE "candidates" ADD COLUMN "resume_file_name" TEXT,
ADD COLUMN "resume_mime_type" TEXT,
ADD COLUMN "resume_size_bytes" INTEGER,
ADD COLUMN "resume_data" BYTEA;
