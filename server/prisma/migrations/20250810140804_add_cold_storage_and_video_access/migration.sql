-- CreateEnum
CREATE TYPE "StorageProvider" AS ENUM ('LOCAL', 'S3', 'GCS', 'AZURE');

-- CreateEnum
CREATE TYPE "StorageClass" AS ENUM ('HOT', 'COLD', 'DEEP_ARCHIVE');

-- CreateEnum
CREATE TYPE "RestoreStatus" AS ENUM ('NONE', 'REQUESTED', 'IN_PROGRESS', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "AccessRequestStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'EXPIRED');

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "coldBucket" TEXT,
ADD COLUMN     "coldKey" TEXT,
ADD COLUMN     "coldRegion" TEXT,
ADD COLUMN     "hotUrl" TEXT,
ADD COLUMN     "restoreExpiresAt" TIMESTAMP(3),
ADD COLUMN     "restoreReadyAt" TIMESTAMP(3),
ADD COLUMN     "restoreRequestedAt" TIMESTAMP(3),
ADD COLUMN     "restoreStatus" "RestoreStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "restoreUrl" TEXT,
ADD COLUMN     "sizeBytes" INTEGER,
ADD COLUMN     "storageClass" "StorageClass" NOT NULL DEFAULT 'HOT',
ADD COLUMN     "storageProvider" "StorageProvider" NOT NULL DEFAULT 'LOCAL';

-- CreateTable
CREATE TABLE "VideoAccessRequest" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "status" "AccessRequestStatus" NOT NULL DEFAULT 'PENDING',
    "signedUrl" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fulfilledAt" TIMESTAMP(3),

    CONSTRAINT "VideoAccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoAccessRequest_videoId_idx" ON "VideoAccessRequest"("videoId");

-- CreateIndex
CREATE INDEX "VideoAccessRequest_requestedById_idx" ON "VideoAccessRequest"("requestedById");

-- CreateIndex
CREATE INDEX "Video_userId_idx" ON "Video"("userId");

-- CreateIndex
CREATE INDEX "Video_createdAt_idx" ON "Video"("createdAt");

-- CreateIndex
CREATE INDEX "Video_storageClass_archivedAt_idx" ON "Video"("storageClass", "archivedAt");

-- CreateIndex
CREATE INDEX "Video_restoreStatus_idx" ON "Video"("restoreStatus");

-- AddForeignKey
ALTER TABLE "VideoAccessRequest" ADD CONSTRAINT "VideoAccessRequest_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoAccessRequest" ADD CONSTRAINT "VideoAccessRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
