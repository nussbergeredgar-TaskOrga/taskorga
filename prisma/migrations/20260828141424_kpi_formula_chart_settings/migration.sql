-- CustomKpi: Formel-Kennzahlen (verrechnen mehrere bestehende Kennzahlen)
ALTER TABLE "CustomKpi" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'BASIC';
ALTER TABLE "CustomKpi" ADD COLUMN "formulaTerms" JSONB;

-- CustomChart: Achsenbeschriftung, Werte-Anzeige, Farben pro Kategorie
ALTER TABLE "CustomChart" ADD COLUMN "xAxisLabel" TEXT;
ALTER TABLE "CustomChart" ADD COLUMN "yAxisLabel" TEXT;
ALTER TABLE "CustomChart" ADD COLUMN "showValueLabels" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CustomChart" ADD COLUMN "valueLabelFormat" TEXT NOT NULL DEFAULT 'VALUE';
ALTER TABLE "CustomChart" ADD COLUMN "colors" JSONB;
