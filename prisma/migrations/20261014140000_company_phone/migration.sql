-- Rufnummer der Firma (bei der Registrierung erfasst). Nullable: bestehende
-- Firmen haben keine, kein Backfill noetig.
ALTER TABLE "Company" ADD COLUMN "phone" TEXT;
