/*
  Warnings:

  - A unique constraint covering the columns `[dailyCheckEntryId]` on the table `Flag` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `dailyCheckEntryId` to the `Flag` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Flag" ADD COLUMN     "dailyCheckEntryId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "DailyCheck" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyCheckEntry" (
    "id" TEXT NOT NULL,
    "dailyCheckId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "fulfilled" BOOLEAN NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyCheckEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Flag_dailyCheckEntryId_key" ON "Flag"("dailyCheckEntryId");

-- AddForeignKey
ALTER TABLE "Flag" ADD CONSTRAINT "Flag_dailyCheckEntryId_fkey" FOREIGN KEY ("dailyCheckEntryId") REFERENCES "DailyCheckEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyCheck" ADD CONSTRAINT "DailyCheck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyCheckEntry" ADD CONSTRAINT "DailyCheckEntry_dailyCheckId_fkey" FOREIGN KEY ("dailyCheckId") REFERENCES "DailyCheck"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyCheckEntry" ADD CONSTRAINT "DailyCheckEntry_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
