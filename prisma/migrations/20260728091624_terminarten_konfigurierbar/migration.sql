/*
  Warnings:

  - The `type` column on the `Appointment` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Appointment" DROP COLUMN "type",
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'Rückruf';

-- DropEnum
DROP TYPE "AppointmentType";

-- CreateTable
CREATE TABLE "AppointmentTypeOption" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentTypeOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentTypeOption_companyId_order_key" ON "AppointmentTypeOption"("companyId", "order");

-- AddForeignKey
ALTER TABLE "AppointmentTypeOption" ADD CONSTRAINT "AppointmentTypeOption_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
