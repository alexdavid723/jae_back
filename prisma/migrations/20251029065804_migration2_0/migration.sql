/*
  Warnings:

  - Added the required column `modality` to the `AcademicPeriod` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AcademicPeriod" ADD COLUMN     "modality" TEXT NOT NULL;
