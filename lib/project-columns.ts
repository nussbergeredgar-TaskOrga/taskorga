import type { ColumnConfig } from "@/lib/actions/list-view";

export type ProjectColumnKey = "customerName" | "number" | "status" | "tasksCount" | "startDate" | "endDate";

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  PLANNED: "Geplant",
  IN_PROGRESS: "In Arbeit",
  DONE: "Abgeschlossen",
  CANCELLED: "Storniert",
};

export const PROJECT_COLUMN_LABELS: Record<ProjectColumnKey, string> = {
  customerName: "Kunde",
  number: "Nummer",
  status: "Status",
  tasksCount: "Aufgaben",
  startDate: "Start",
  endDate: "Ende",
};

// "Titel" (Link zum Auftrag) ist immer sichtbar und fixiert -- alle anderen
// Spalten sind ein-/ausblendbar, umsortierbar und in der Breite anpassbar.
export const PROJECT_COLUMNS_DEFAULT: ColumnConfig[] = [
  { key: "customerName", visible: true, order: 0, width: 180 },
  { key: "number", visible: true, order: 1, width: 110 },
  { key: "status", visible: true, order: 2, width: 120 },
  { key: "tasksCount", visible: true, order: 3, width: 90 },
  { key: "startDate", visible: false, order: 4, width: 110 },
  { key: "endDate", visible: false, order: 5, width: 110 },
];
