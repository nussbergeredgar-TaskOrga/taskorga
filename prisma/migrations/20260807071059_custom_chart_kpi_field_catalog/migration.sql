-- CustomKpi: neues, optionales Datumsfeld fuer das Zeitfenster (null = Standardfeld
-- aus lib/custom-kpi.ts DATE_FIELD_BY_ENTITY -- rein additiv, kein Backfill noetig)
ALTER TABLE "CustomKpi" ADD COLUMN "dateField" TEXT;

-- CustomChart: neue Zusatzkonfiguration fuer Datum/Zahl-Gruppierung
ALTER TABLE "CustomChart" ADD COLUMN "groupByConfig" JSONB;

-- Backfill bestehender Diagramme: groupBy = 'month' -> groupByField auf das
-- bisherige feste Datumsfeld je Entitaet setzen, groupByConfig bewahrt exakt
-- das bisherige Verhalten (Monat, 6 Perioden).
UPDATE "CustomChart"
SET "groupByField" = CASE "entity"
      WHEN 'customers'    THEN 'customerSince'
      WHEN 'inquiries'    THEN 'createdAt'
      WHEN 'quotes'       THEN 'createdAt'
      WHEN 'projects'     THEN 'createdAt'
      WHEN 'invoices'     THEN 'createdAt'
      WHEN 'appointments' THEN 'scheduledAt'
      WHEN 'expenses'     THEN 'date'
      ELSE 'createdAt'
    END,
    "groupByConfig" = '{"granularity":"month","windowCount":6}'::jsonb
WHERE "groupBy" = 'month';

-- Backfill: groupBy = 'status' -> groupByField ist schlicht das Feld "status"
UPDATE "CustomChart"
SET "groupByField" = 'status',
    "groupByConfig" = NULL
WHERE "groupBy" = 'status';

-- Backfill: groupBy = 'field' -> groupByField ist bereits gesetzt, nur
-- groupByConfig explizit auf null (Enum/Text-Felder brauchen keine Zusatzkonfiguration)
UPDATE "CustomChart"
SET "groupByConfig" = NULL
WHERE "groupBy" = 'field';

-- Verteidigend: falls ein Datensatz weder ueber groupBy noch groupByField
-- sinnvoll abgedeckt ist (sollte durch die App-Logik nicht vorkommen)
UPDATE "CustomChart"
SET "groupByField" = 'createdAt',
    "groupByConfig" = '{"granularity":"month","windowCount":6}'::jsonb
WHERE "groupByField" IS NULL;

-- Jetzt sicher Pflichtfeld setzen und die alte Sentinel-Spalte entfernen
ALTER TABLE "CustomChart" ALTER COLUMN "groupByField" SET NOT NULL;
ALTER TABLE "CustomChart" DROP COLUMN "groupBy";
