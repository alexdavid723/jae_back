/*
  Warnings:

  - Added the required column `institution_id` to the `Plan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `institution_id` to the `Student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `institution_id` to the `Teacher` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "institution_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "institution_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "institution_id" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "Institution" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrollmentSheet" (
    "id" SERIAL NOT NULL,
    "institution_id" INTEGER NOT NULL,
    "program_id" INTEGER NOT NULL,
    "admission_id" INTEGER NOT NULL,
    "module_name" TEXT NOT NULL,
    "academic_period" TEXT NOT NULL,
    "class_period" TEXT NOT NULL,
    "shift" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnrollmentSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrollmentSheetItem" (
    "id" SERIAL NOT NULL,
    "enrollment_sheet_id" INTEGER NOT NULL,
    "enrollment_id" INTEGER NOT NULL,
    "student_name" TEXT NOT NULL,
    "sex" TEXT NOT NULL,
    "birth_date" TIMESTAMP(3) NOT NULL,
    "condition" TEXT NOT NULL,
    "units" INTEGER NOT NULL,
    "credits" INTEGER NOT NULL,

    CONSTRAINT "EnrollmentSheetItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Institution_code_key" ON "Institution"("code");

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentSheet" ADD CONSTRAINT "EnrollmentSheet_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentSheet" ADD CONSTRAINT "EnrollmentSheet_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentSheet" ADD CONSTRAINT "EnrollmentSheet_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "AdmissionProcess"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentSheetItem" ADD CONSTRAINT "EnrollmentSheetItem_enrollment_sheet_id_fkey" FOREIGN KEY ("enrollment_sheet_id") REFERENCES "EnrollmentSheet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentSheetItem" ADD CONSTRAINT "EnrollmentSheetItem_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "Enrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
