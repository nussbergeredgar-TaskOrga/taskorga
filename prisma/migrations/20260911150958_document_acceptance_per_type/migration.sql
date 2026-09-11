ALTER TABLE "User" ADD COLUMN "avvAcceptedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "datenschutzAcceptedAt" TIMESTAMP(3);

-- Bestandsnutzer rueckwirkend als bestaetigt markieren, damit das neue
-- Bestaetigungs-Gate (app/dokumente-bestaetigen) niemanden aus einem bereits
-- laufenden Konto aussperrt. Wer schon "agbAcceptedAt" hatte (alte
-- Sammel-Checkbox), bekommt denselben Zeitpunkt fuer AVV/Datenschutz; wer
-- noch gar keinen hatte (Konto von vor dieser Funktion ueberhaupt), bekommt
-- ueberall den Zeitpunkt der Kontoerstellung.
UPDATE "User"
SET "avvAcceptedAt" = COALESCE("agbAcceptedAt", "createdAt"),
    "datenschutzAcceptedAt" = COALESCE("agbAcceptedAt", "createdAt"),
    "agbAcceptedAt" = COALESCE("agbAcceptedAt", "createdAt");
