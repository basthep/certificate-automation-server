/*
  Warnings:

  - A unique constraint covering the columns `[templateFieldId]` on the table `FieldMapping` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "FieldMapping_templateFieldId_key" ON "FieldMapping"("templateFieldId");
