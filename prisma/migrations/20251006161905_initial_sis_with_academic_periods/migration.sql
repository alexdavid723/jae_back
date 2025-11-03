/*
  Warnings:

  - You are about to drop the column `year` on the `AdmissionProcess` table. All the data in the column will be lost.
  - You are about to drop the column `semester` on the `Assignment` table. All the data in the column will be lost.
  - You are about to drop the column `year` on the `Assignment` table. All the data in the column will be lost.
  - You are about to drop the column `academic_period` on the `EnrollmentSheet` table. All the data in the column will be lost.
  - You are about to drop the `Initiative` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Objective` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[course_id,teacher_id,academic_period_id]` on the table `Assignment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[enrollment_id,course_id]` on the table `EnrollmentCourse` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[student_id,assignment_id]` on the table `Grade` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `academic_period_id` to the `AdmissionProcess` table without a default value. This is not possible if the table is not empty.
  - Added the required column `academic_period_id` to the `Assignment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `academic_period_id` to the `EnrollmentSheet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `plan_id` to the `Program` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Initiative" DROP CONSTRAINT "Initiative_objective_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Objective" DROP CONSTRAINT "Objective_plan_id_fkey";

-- AlterTable
ALTER TABLE "AdmissionProcess" DROP COLUMN "year",
ADD COLUMN     "academic_period_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Assignment" DROP COLUMN "semester",
DROP COLUMN "year",
ADD COLUMN     "academic_period_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "EnrollmentSheet" DROP COLUMN "academic_period",
ADD COLUMN     "academic_period_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Program" ADD COLUMN     "plan_id" INTEGER NOT NULL;

-- DropTable
DROP TABLE "public"."Initiative";

-- DropTable
DROP TABLE "public"."Objective";

-- CreateTable
CREATE TABLE "AcademicPeriod" (
    "id" SERIAL NOT NULL,
    "institution_id" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AcademicPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AcademicPeriod_institution_id_year_name_key" ON "AcademicPeriod"("institution_id", "year", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_course_id_teacher_id_academic_period_id_key" ON "Assignment"("course_id", "teacher_id", "academic_period_id");

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentCourse_enrollment_id_course_id_key" ON "EnrollmentCourse"("enrollment_id", "course_id");

-- CreateIndex
CREATE UNIQUE INDEX "Grade_student_id_assignment_id_key" ON "Grade"("student_id", "assignment_id");

-- AddForeignKey
ALTER TABLE "AcademicPeriod" ADD CONSTRAINT "AcademicPeriod_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_academic_period_id_fkey" FOREIGN KEY ("academic_period_id") REFERENCES "AcademicPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionProcess" ADD CONSTRAINT "AdmissionProcess_academic_period_id_fkey" FOREIGN KEY ("academic_period_id") REFERENCES "AcademicPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentSheet" ADD CONSTRAINT "EnrollmentSheet_academic_period_id_fkey" FOREIGN KEY ("academic_period_id") REFERENCES "AcademicPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
