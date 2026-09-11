ALTER TABLE "SystemEmailSettings" ALTER COLUMN "signatureAddress1" SET DEFAULT 'Am Kirchberger Weg 28';
ALTER TABLE "SystemEmailSettings" ALTER COLUMN "signatureAddress2" SET DEFAULT '55471 Külz';

-- Bestehende Zeile(n) mit der alten Adresse als Wert (nicht nur als Default)
-- auf die neue Adresse aktualisieren.
UPDATE "SystemEmailSettings"
SET "signatureAddress1" = 'Am Kirchberger Weg 28'
WHERE "signatureAddress1" = 'In der Mudersbach 6';

UPDATE "SystemEmailSettings"
SET "signatureAddress2" = '55471 Külz'
WHERE "signatureAddress2" = '55469 Mutterschied';
