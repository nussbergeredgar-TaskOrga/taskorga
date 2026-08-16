-- AlterTable: Kundennummer-Format + gemeinsamer atomarer Zaehler (Customer + Contact)
ALTER TABLE "Company" ADD COLUMN     "customerNumberFormat" TEXT NOT NULL DEFAULT 'KD-{NNNN}',
ADD COLUMN     "customerNumberSeq" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "number" TEXT;

-- AlterTable: companyId zunaechst nullable, wird unten befuellt und dann NOT NULL gesetzt
ALTER TABLE "Contact" ADD COLUMN     "companyId" TEXT,
ADD COLUMN     "number" TEXT;

UPDATE "Contact" c SET "companyId" = cu."companyId"
FROM "Customer" cu WHERE cu."id" = c."customerId";

ALTER TABLE "Contact" ALTER COLUMN "companyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "contactId" TEXT,
ADD COLUMN     "createdByUserId" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "contactId" TEXT,
ADD COLUMN     "createdByUserId" TEXT;

-- AlterTable: neues Standardlayout, Default true = automatisch fuer alle bestehenden Vorlagen aktiv
ALTER TABLE "DocumentTemplate" ADD COLUMN     "coloredHeaderFooter" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showPositionNumbers" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showCustomerNumber" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showCreator" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_companyId_number_key" ON "Customer"("companyId", "number");

-- CreateIndex
CREATE INDEX "Contact_companyId_idx" ON "Contact"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_companyId_number_key" ON "Contact"("companyId", "number");

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
