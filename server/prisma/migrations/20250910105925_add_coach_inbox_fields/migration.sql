-- AlterTable
ALTER TABLE "Absence" ADD COLUMN     "coachId" TEXT,
ADD COLUMN     "processed" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Absence_coachId_type_processed_idx" ON "Absence"("coachId", "type", "processed");

-- AddForeignKey
ALTER TABLE "Absence" ADD CONSTRAINT "Absence_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
