-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "maxUsers" INTEGER;

-- AlterTable
ALTER TABLE "EmailInvite" ADD COLUMN     "maxUsers" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "EmailInvite" ALTER COLUMN "maxUsers" DROP DEFAULT;
