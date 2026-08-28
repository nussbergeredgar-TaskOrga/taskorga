-- Optionaler Sollwert fuer Kennzahlen (BASIC und FORMULA), fuer den
-- Fortschrittsbalken in components/kpi-manager.tsx.
ALTER TABLE "CustomKpi" ADD COLUMN "targetValue" DOUBLE PRECISION;
