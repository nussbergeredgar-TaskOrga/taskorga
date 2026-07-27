-- CreateTable
CREATE TABLE "ReminderLevel" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "daysAfterDue" INTEGER NOT NULL DEFAULT 0,
    "introText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReminderLevel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReminderLevel_companyId_order_key" ON "ReminderLevel"("companyId", "order");

-- AddForeignKey
ALTER TABLE "ReminderLevel" ADD CONSTRAINT "ReminderLevel_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
