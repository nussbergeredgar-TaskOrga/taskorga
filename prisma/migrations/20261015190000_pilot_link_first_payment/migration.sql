-- Pilot-Einladung per Link: ein InviteCode kann eine eigene Testdauer und eine
-- Nutzerobergrenze mitbringen (null = Standard bzw. unbegrenzt, wie bisher).
ALTER TABLE "InviteCode" ADD COLUMN "trialDays" INTEGER;
ALTER TABLE "InviteCode" ADD COLUMN "maxUsers" INTEGER;

-- Betreiber-Mail "erster zahlender Kunde": Marker je Firma. Bestandsfirmen, die
-- bereits zahlen oder dauerhaft befreit sind, werden als erledigt markiert,
-- damit ihre naechste Rechnung nicht als Neukunde gemeldet wird.
ALTER TABLE "Company" ADD COLUMN "firstPaymentNotifiedAt" TIMESTAMP(3);
UPDATE "Company"
SET "firstPaymentNotifiedAt" = NOW()
WHERE "subscriptionStatus" <> 'TRIALING' OR "billingExempt" = true OR "isPlatformOwner" = true;
