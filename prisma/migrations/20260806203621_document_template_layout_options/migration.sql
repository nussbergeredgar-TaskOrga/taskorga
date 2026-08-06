-- CreateEnum
CREATE TYPE "LogoPosition" AS ENUM ('TOP_LEFT', 'TOP_RIGHT', 'TOP_CENTER', 'HIDDEN');

-- AlterTable
ALTER TABLE "DocumentTemplate" ADD COLUMN     "logoPosition" "LogoPosition" NOT NULL DEFAULT 'TOP_RIGHT',
ADD COLUMN     "showBankDetails" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showCompanyEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showSenderLine" BOOLEAN NOT NULL DEFAULT false;
