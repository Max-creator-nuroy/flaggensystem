-- CreateEnum
CREATE TYPE "AbsenceType" AS ENUM ('VACATION', 'SICK');

-- CreateTable
CREATE TABLE "Absence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AbsenceType" NOT NULL,
    "from" TIMESTAMP(3) NOT NULL,
    "to" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Absence_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Absence" ADD CONSTRAINT "Absence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
