-- AlterTable
ALTER TABLE "CustomKpi" ADD COLUMN     "dateFrom" TIMESTAMP(3),
ADD COLUMN     "dateRangeType" TEXT NOT NULL DEFAULT 'ALL',
ADD COLUMN     "dateTo" TIMESTAMP(3);
