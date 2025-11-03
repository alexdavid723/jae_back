/*
  Warnings:

  - You are about to drop the column `institution_id` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."User" DROP CONSTRAINT "User_institution_id_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "institution_id";

-- CreateTable
CREATE TABLE "InstitutionAdmin" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "institution_id" INTEGER NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstitutionAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InstitutionAdmin_user_id_institution_id_key" ON "InstitutionAdmin"("user_id", "institution_id");

-- AddForeignKey
ALTER TABLE "InstitutionAdmin" ADD CONSTRAINT "InstitutionAdmin_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionAdmin" ADD CONSTRAINT "InstitutionAdmin_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
