-- CreateTable
CREATE TABLE "CustomKpi" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "aggregation" TEXT NOT NULL,
    "sumField" TEXT,
    "statusValue" TEXT,
    "accent" TEXT NOT NULL DEFAULT 'border-l-brand-500',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomKpi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomKpi_companyId_idx" ON "CustomKpi"("companyId");

-- AddForeignKey
ALTER TABLE "CustomKpi" ADD CONSTRAINT "CustomKpi_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
