// Auswaehlbare Datenbestaende fuer den Export bei gesperrtem Zugang. Gemeinsam
// von der Auswahl-Oberflaeche und der Export-Route verwendet.
export const EXPORT_DATASETS = [
  { key: "customers", label: "Kunden", hint: "Stammdaten, Adressen, Notizen" },
  { key: "contacts", label: "Ansprechpartner", hint: "Personen bei Firmenkunden" },
  { key: "inquiries", label: "Anfragen", hint: "inkl. Status und Betrag" },
  { key: "quotes", label: "Angebote", hint: "inkl. Positionen" },
  { key: "projects", label: "Aufträge", hint: "Nummer, Status, Zeitraum" },
  { key: "invoices", label: "Rechnungen", hint: "inkl. Positionen und Zahlungsstand" },
  { key: "expenses", label: "Ausgaben", hint: "Belege und Kosten" },
  { key: "tasks", label: "Aufgaben", hint: "Status, Fälligkeit, Zuständige" },
  { key: "appointments", label: "Termine", hint: "Art, Zeitpunkt, Status" },
  { key: "documents", label: "Dokumente", hint: "Dateiliste; auf Wunsch mit den Dateien selbst" },
] as const;

export type ExportDatasetKey = (typeof EXPORT_DATASETS)[number]["key"];

export const EXPORT_DATASET_KEYS: ExportDatasetKey[] = EXPORT_DATASETS.map((d) => d.key);

export function isExportDatasetKey(value: string): value is ExportDatasetKey {
  return (EXPORT_DATASET_KEYS as string[]).includes(value);
}
