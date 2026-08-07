-- Korrektur zur vorherigen Migration: der Spalten-DEFAULT now() wurde
-- faelschlich auch bei INSERTs angewendet, die die Spalte einfach weglassen
-- (z.B. Prisma-create()-Aufrufe ohne explizites onboardingCompletedAt) -- damit
-- bekam JEDER neue Nutzer sofort ein gesetztes onboardingCompletedAt und die
-- Pflicht-Tour startete nie. Bereits befuellte Bestandszeilen bleiben
-- unveraendert, nur kuenftige INSERTs ohne expliziten Wert ergeben ab jetzt NULL.
ALTER TABLE "User" ALTER COLUMN "onboardingCompletedAt" DROP DEFAULT;
