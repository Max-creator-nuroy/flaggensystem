/*
  Warnings:

  - You are about to drop the column `stageId` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the `PipelineStage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Lead" DROP CONSTRAINT "Lead_stageId_fkey";

-- AlterTable
ALTER TABLE "Lead" DROP COLUMN "stageId";

-- DropTable
DROP TABLE "PipelineStage";
