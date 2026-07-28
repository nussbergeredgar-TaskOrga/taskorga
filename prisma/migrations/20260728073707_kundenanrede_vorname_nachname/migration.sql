-- CreateEnum
CREATE TYPE "CustomerSalutation" AS ENUM ('HERR', 'FRAU', 'DIVERS');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "salutation" "CustomerSalutation";
