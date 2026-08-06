-- AlterTable
ALTER TABLE "CustomChart" ADD COLUMN     "filterConditions" JSONB,
ADD COLUMN     "groupByField" TEXT;

-- AlterTable
ALTER TABLE "CustomKpi" ADD COLUMN     "filterConditions" JSONB;
