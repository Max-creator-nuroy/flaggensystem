/*
  Warnings:

  - You are about to drop the column `reason` on the `Flag` table. All the data in the column will be lost.
  - Added the required column `requirementId` to the `Flag` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Flag" DROP COLUMN "reason",
ADD COLUMN     "requirementId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "FlagEscalationLink" (
    "id" TEXT NOT NULL,
    "fromFlagId" TEXT NOT NULL,
    "toFlagId" TEXT NOT NULL,

    CONSTRAINT "FlagEscalationLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Requirement" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Requirement_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Flag" ADD CONSTRAINT "Flag_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlagEscalationLink" ADD CONSTRAINT "FlagEscalationLink_fromFlagId_fkey" FOREIGN KEY ("fromFlagId") REFERENCES "Flag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlagEscalationLink" ADD CONSTRAINT "FlagEscalationLink_toFlagId_fkey" FOREIGN KEY ("toFlagId") REFERENCES "Flag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
