-- Verhindert Mehrfachversand der "Testphase endet bald"-Mail bei Stripe-Webhook-Retries.
-- Nullable, kein Backfill noetig -- bestehende Firmen haben diese Mail naturgemaess noch nie bekommen.
ALTER TABLE "Company" ADD COLUMN "trialEndingWarningEmailSentAt" TIMESTAMP(3);
