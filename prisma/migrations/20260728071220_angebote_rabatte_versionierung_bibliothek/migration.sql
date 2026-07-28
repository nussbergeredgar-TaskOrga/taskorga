-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "defaultDiscountType" TEXT NOT NULL DEFAULT 'AMOUNT',
ADD COLUMN     "defaultQuoteValidityDays" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "invoiceNumberFormat" TEXT NOT NULL DEFAULT 'RE-{YYYY}-{NNNN}',
ADD COLUMN     "projectNumberFormat" TEXT NOT NULL DEFAULT 'AUF-{YYYY}-{NNNN}',
ADD COLUMN     "quoteNumberFormat" TEXT NOT NULL DEFAULT 'ANG-{YYYY}-{NNNN}';

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "discountType" TEXT NOT NULL DEFAULT 'AMOUNT',
ADD COLUMN     "discountValue" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "InvoiceItem" ADD COLUMN     "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 19;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "discountType" TEXT NOT NULL DEFAULT 'AMOUNT',
ADD COLUMN     "discountValue" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "QuoteItem" ADD COLUMN     "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 19;

-- CreateTable
CREATE TABLE "ItemTemplate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'Stk',
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 19,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteVersion" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemTemplate_companyId_idx" ON "ItemTemplate"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteVersion_quoteId_versionNumber_key" ON "QuoteVersion"("quoteId", "versionNumber");

-- AddForeignKey
ALTER TABLE "ItemTemplate" ADD CONSTRAINT "ItemTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteVersion" ADD CONSTRAINT "QuoteVersion_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
