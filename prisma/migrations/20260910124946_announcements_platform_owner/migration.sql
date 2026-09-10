ALTER TABLE "Company" ADD COLUMN "isPlatformOwner" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Company" ADD COLUMN "updateRequestedAt" TIMESTAMP(3);

ALTER TABLE "User" ADD COLUMN "announcementsSeenAt" TIMESTAMP(3);

CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "teaser" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Announcement_publishedAt_idx" ON "Announcement"("publishedAt");
