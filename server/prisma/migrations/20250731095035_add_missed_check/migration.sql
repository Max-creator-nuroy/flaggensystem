-- CreateTable
CREATE TABLE "MissedCheck" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissedCheck_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MissedCheck" ADD CONSTRAINT "MissedCheck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
