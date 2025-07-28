/*
  Warnings:

  - A unique constraint covering the columns `[videoId]` on the table `DailyCheck` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,date]` on the table `DailyCheck` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `videoId` to the `DailyCheck` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DailyCheck" ADD COLUMN     "videoId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "DailyCheck_videoId_key" ON "DailyCheck"("videoId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyCheck_userId_date_key" ON "DailyCheck"("userId", "date");

-- AddForeignKey
ALTER TABLE "DailyCheck" ADD CONSTRAINT "DailyCheck_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
