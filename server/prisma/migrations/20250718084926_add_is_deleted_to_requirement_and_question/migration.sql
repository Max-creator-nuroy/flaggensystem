-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Requirement" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;
