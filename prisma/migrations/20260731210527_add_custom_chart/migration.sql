-- CreateTable
CREATE TABLE "CustomChart" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "chartType" TEXT NOT NULL,
    "groupBy" TEXT NOT NULL,
    "aggregation" TEXT NOT NULL,
    "sumField" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomChart_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomChart_companyId_idx" ON "CustomChart"("companyId");

-- AddForeignKey
ALTER TABLE "CustomChart" ADD CONSTRAINT "CustomChart_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
