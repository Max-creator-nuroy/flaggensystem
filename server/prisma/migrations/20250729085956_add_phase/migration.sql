-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phaseId" TEXT;

-- CreateTable
CREATE TABLE "Phase" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "label" TEXT,

    CONSTRAINT "Phase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Phase_name_key" ON "Phase"("name");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
