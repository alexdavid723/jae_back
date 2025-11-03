-- AlterTable
ALTER TABLE "Program" ADD COLUMN     "duration_months" INTEGER,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;
