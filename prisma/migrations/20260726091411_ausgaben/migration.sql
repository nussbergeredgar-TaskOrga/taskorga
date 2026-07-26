-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('OPEN', 'PAID');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "status" "ExpenseStatus" NOT NULL DEFAULT 'OPEN';
