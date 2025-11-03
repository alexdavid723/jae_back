/*
  Warnings:

  - A unique constraint covering the columns `[institution_id,name]` on the table `Faculty` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `institution_id` to the `Faculty` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Faculty" ADD COLUMN     "institution_id" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Faculty_institution_id_name_key" ON "Faculty"("institution_id", "name");

-- AddForeignKey
ALTER TABLE "Faculty" ADD CONSTRAINT "Faculty_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
