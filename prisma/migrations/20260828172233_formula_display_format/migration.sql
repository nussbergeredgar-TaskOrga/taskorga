-- Formel-Kennzahlen: explizites Anzeigeformat (Betrag/Anzahl/Prozent), noetig
-- fuer Verhaeltniskennzahlen (x/÷), bei denen sich das Format nicht mehr aus
-- den Termen ableiten laesst. null = automatisch hergeleitet (Bestandsdaten).
ALTER TABLE "CustomKpi" ADD COLUMN "formulaDisplayFormat" TEXT;
