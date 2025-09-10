-- CreateEnum
CREATE TYPE "SurveyScheduleType" AS ENUM ('ADMIN_TO_COACHES', 'COACH_TO_CUSTOMERS');

-- CreateTable
CREATE TABLE "SurveySchedule" (
    "id" TEXT NOT NULL,
    "type" "SurveyScheduleType" NOT NULL,
    "cronExpression" TEXT NOT NULL,
    "timezone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "comment" TEXT,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveySchedule_pkey" PRIMARY KEY ("id")
);
