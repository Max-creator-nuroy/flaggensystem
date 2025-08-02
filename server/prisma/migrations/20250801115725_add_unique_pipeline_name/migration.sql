/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `PipelineStage` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "PipelineStage_name_key" ON "PipelineStage"("name");
