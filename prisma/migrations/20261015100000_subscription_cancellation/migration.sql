-- Kuendigung zum Periodenende: Ende des Zugangs und Merker fuer die versendete
-- Bestaetigungsmail. Beide nullable, kein Backfill noetig.
ALTER TABLE "Company" ADD COLUMN "cancelAt" TIMESTAMP(3),
ADD COLUMN "cancellationEmailSentAt" TIMESTAMP(3);
