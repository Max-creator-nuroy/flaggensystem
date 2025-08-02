-- DropForeignKey
ALTER TABLE "Flag" DROP CONSTRAINT "Flag_dailyCheckEntryId_fkey";

-- DropForeignKey
ALTER TABLE "Flag" DROP CONSTRAINT "Flag_requirementId_fkey";

-- AlterTable
ALTER TABLE "Flag" ADD COLUMN     "comment" TEXT,
ALTER COLUMN "requirementId" DROP NOT NULL,
ALTER COLUMN "dailyCheckEntryId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Flag" ADD CONSTRAINT "Flag_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flag" ADD CONSTRAINT "Flag_dailyCheckEntryId_fkey" FOREIGN KEY ("dailyCheckEntryId") REFERENCES "DailyCheckEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
