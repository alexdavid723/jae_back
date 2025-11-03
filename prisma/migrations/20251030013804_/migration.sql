/*
  Warnings:

  - A unique constraint covering the columns `[course_id,academic_period_id,shift]` on the table `Assignment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `shift` to the `Assignment` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."Assignment_course_id_teacher_id_academic_period_id_key";

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "shift" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_course_id_academic_period_id_shift_key" ON "Assignment"("course_id", "academic_period_id", "shift");
