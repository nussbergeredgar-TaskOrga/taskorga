-- E-Rechnung (XRechnung): optionale Angaben am Kunden. Nullable, kein Backfill noetig.
ALTER TABLE "Customer" ADD COLUMN "vatId" TEXT,
ADD COLUMN "buyerReference" TEXT;
