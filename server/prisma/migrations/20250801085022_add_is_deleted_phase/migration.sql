/*
  Warnings:

  - Added the required column `isDeleted` to the `Phase` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Phase" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL;
