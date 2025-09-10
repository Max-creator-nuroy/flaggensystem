/*
  Warnings:

  - A unique constraint covering the columns `[userId,date]` on the table `MissedCheck` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "MissedCheck_userId_flagged_idx" ON "MissedCheck"("userId", "flagged");

-- CreateIndex
CREATE UNIQUE INDEX "MissedCheck_userId_date_key" ON "MissedCheck"("userId", "date");
