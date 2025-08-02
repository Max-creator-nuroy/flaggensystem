/*
  Warnings:

  - The values [VACATION,SICK] on the enum `AbsenceType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AbsenceType_new" AS ENUM ('URLAUB', 'KRANKHEIT', 'ANDERES');
ALTER TABLE "Absence" ALTER COLUMN "type" TYPE "AbsenceType_new" USING ("type"::text::"AbsenceType_new");
ALTER TYPE "AbsenceType" RENAME TO "AbsenceType_old";
ALTER TYPE "AbsenceType_new" RENAME TO "AbsenceType";
DROP TYPE "AbsenceType_old";
COMMIT;
