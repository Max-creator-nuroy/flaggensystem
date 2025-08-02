/*
  Warnings:

  - Added the required column `coachId` to the `Phase` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Phase" ADD COLUMN     "coachId" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT;

-- AddForeignKey
ALTER TABLE "Phase" ADD CONSTRAINT "Phase_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Phase" ADD CONSTRAINT "Phase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
