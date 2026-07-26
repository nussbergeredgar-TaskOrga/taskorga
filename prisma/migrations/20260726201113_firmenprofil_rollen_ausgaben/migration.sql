-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "address" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "bic" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "iban" TEXT,
ADD COLUMN     "invoiceFooterText" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "taxNumber" TEXT,
ADD COLUMN     "vatId" TEXT,
ADD COLUMN     "zip" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "navConfig" JSONB;
