/*
  Warnings:

  - The values [INTERESSENT,SETTING_NOSHOW,DOWNSELL,CLOSING_NOSHOW,KUNDE,LOST] on the enum `PipelineStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PipelineStatus_new" AS ENUM ('NEU', 'ANGESCHRIEBEN', 'ANTWORT_ERHALTEN', 'SETTING_TERMINIERT', 'CLOSING_TERMINIERT', 'DEAL_CLOSED', 'LOST_DISQUALIFIZIERT', 'FOLLOW_UP', 'NO_SHOW', 'TERMIN_ABGESAGT', 'TERMIN_VERSCHOBEN');
ALTER TABLE "Lead" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Lead" ALTER COLUMN "status" TYPE "PipelineStatus_new" USING ("status"::text::"PipelineStatus_new");
ALTER TYPE "PipelineStatus" RENAME TO "PipelineStatus_old";
ALTER TYPE "PipelineStatus_new" RENAME TO "PipelineStatus";
DROP TYPE "PipelineStatus_old";
ALTER TABLE "Lead" ALTER COLUMN "status" SET DEFAULT 'NEU';
COMMIT;

-- AlterTable
ALTER TABLE "Lead" ALTER COLUMN "status" SET DEFAULT 'NEU';
