/*
  Warnings:

  - A unique constraint covering the columns `[mobileNumber]` on the table `Lead` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Lead_mobileNumber_key" ON "Lead"("mobileNumber");
