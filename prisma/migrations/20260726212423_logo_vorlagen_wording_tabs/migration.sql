-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "customerTabsConfig" JSONB,
ADD COLUMN     "documentAccentColor" TEXT NOT NULL DEFAULT '#2F5FFF',
ADD COLUMN     "documentIntroText" TEXT,
ADD COLUMN     "navLabels" JSONB,
ADD COLUMN     "showVatOnDocuments" BOOLEAN NOT NULL DEFAULT true;
