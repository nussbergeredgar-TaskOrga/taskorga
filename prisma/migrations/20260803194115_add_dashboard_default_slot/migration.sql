-- AlterTable
ALTER TABLE "Dashboard" ADD COLUMN     "defaultSlot" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Dashboard_userId_defaultSlot_key" ON "Dashboard"("userId", "defaultSlot");
