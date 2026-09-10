ALTER TABLE "Task" ADD COLUMN "createdByUserId" TEXT;
ALTER TABLE "Task" ADD COLUMN "escalationLevelSent" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Task" ADD CONSTRAINT "Task_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "TaskEscalationLevel" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "daysOverdue" INTEGER NOT NULL DEFAULT 1,
    "notifyAssignee" BOOLEAN NOT NULL DEFAULT true,
    "extraRecipients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskEscalationLevel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TaskEscalationLevel_companyId_order_key" ON "TaskEscalationLevel"("companyId", "order");

ALTER TABLE "TaskEscalationLevel" ADD CONSTRAINT "TaskEscalationLevel_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
