import type { ColumnConfig } from "@/lib/actions/list-view";

export type TaskColumnKey = "customerName" | "assigneeName" | "priority" | "dueDate" | "status";

export const TASK_STATUS_LABELS: Record<string, string> = {
  OPEN: "Offen",
  IN_PROGRESS: "In Arbeit",
  DONE: "Erledigt",
  CANCELLED: "Storniert",
};

export const TASK_PRIORITY_LABELS: Record<string, string> = {
  LOW: "Niedrig",
  NORMAL: "Normal",
  HIGH: "Hoch",
  URGENT: "Dringend",
};

export const TASK_COLUMN_LABELS: Record<TaskColumnKey, string> = {
  customerName: "Kunde",
  assigneeName: "Zuständig",
  priority: "Priorität",
  dueDate: "Fällig am",
  status: "Status",
};

// "Titel" (Link zur Aufgabe) ist immer sichtbar und fixiert -- alle anderen
// Spalten sind ein-/ausblendbar, umsortierbar und in der Breite anpassbar.
export const TASK_COLUMNS_DEFAULT: ColumnConfig[] = [
  { key: "status", visible: true, order: 0, width: 120 },
  { key: "dueDate", visible: true, order: 1, width: 120 },
  { key: "assigneeName", visible: true, order: 2, width: 140 },
  { key: "priority", visible: true, order: 3, width: 110 },
  { key: "customerName", visible: false, order: 4, width: 160 },
];
