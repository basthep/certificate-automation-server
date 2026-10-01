-- CreateTable
CREATE TABLE "DataFile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "sheetName" TEXT,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "columns" JSONB NOT NULL,
    "automationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataFile_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DataFile" ADD CONSTRAINT "DataFile_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
