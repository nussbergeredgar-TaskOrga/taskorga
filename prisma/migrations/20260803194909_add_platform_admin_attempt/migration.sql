-- CreateTable
CREATE TABLE "PlatformAdminAttempt" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformAdminAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlatformAdminAttempt_createdAt_idx" ON "PlatformAdminAttempt"("createdAt");
