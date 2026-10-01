-- CreateTable
CREATE TABLE "FieldMapping" (
    "id" TEXT NOT NULL,
    "templateFieldId" TEXT NOT NULL,
    "columnName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldMapping_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FieldMapping" ADD CONSTRAINT "FieldMapping_templateFieldId_fkey" FOREIGN KEY ("templateFieldId") REFERENCES "TemplateField"("id") ON DELETE CASCADE ON UPDATE CASCADE;
