-- CreateTable
CREATE TABLE "AbsenceRequest" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "type" "AbsenceType" NOT NULL,
    "from" TIMESTAMP(3) NOT NULL,
    "to" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "accepted" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "absenceId" TEXT,

    CONSTRAINT "AbsenceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AbsenceRequest_absenceId_key" ON "AbsenceRequest"("absenceId");

-- CreateIndex
CREATE INDEX "AbsenceRequest_coachId_processed_accepted_idx" ON "AbsenceRequest"("coachId", "processed", "accepted");

-- CreateIndex
CREATE INDEX "AbsenceRequest_customerId_idx" ON "AbsenceRequest"("customerId");

-- AddForeignKey
ALTER TABLE "AbsenceRequest" ADD CONSTRAINT "AbsenceRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenceRequest" ADD CONSTRAINT "AbsenceRequest_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenceRequest" ADD CONSTRAINT "AbsenceRequest_absenceId_fkey" FOREIGN KEY ("absenceId") REFERENCES "Absence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
