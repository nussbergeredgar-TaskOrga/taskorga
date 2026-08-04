-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "defaultHourlyRate" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "TimeEntry" ADD COLUMN     "billed" BOOLEAN NOT NULL DEFAULT false;
