/*
  Warnings:

  - Added the required column `email` to the `Lead` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Lead" DROP CONSTRAINT "Lead_stageId_fkey";

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "email" TEXT NOT NULL,
ALTER COLUMN "stageId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "PipelineStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
