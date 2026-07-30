-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "revenueSources" TEXT[] DEFAULT ARRAY['invoice_paid']::TEXT[];
