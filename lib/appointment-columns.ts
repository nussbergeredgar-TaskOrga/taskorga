import type { ColumnConfig } from "@/lib/actions/list-view";

export type AppointmentColumnKey = "customerName" | "type" | "status" | "scheduledAt" | "amount";

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  REQUESTED: "Angefragt",
  SCHEDULED: "Geplant",
  DONE: "Erledigt",
  CANCELLED: "Storniert",
};

export const APPOINTMENT_COLUMN_LABELS: Record<AppointmentColumnKey, string> = {
  customerName: "Kunde",
  type: "Art",
  status: "Status",
  scheduledAt: "Termin",
  amount: "Betrag",
};

// "Titel" (Link zum Termin) ist immer sichtbar und fixiert -- alle anderen
// Spalten sind ein-/ausblendbar, umsortierbar und in der Breite anpassbar.
export const APPOINTMENT_COLUMNS_DEFAULT: ColumnConfig[] = [
  { key: "customerName", visible: true, order: 0, width: 180 },
  { key: "scheduledAt", visible: true, order: 1, width: 160 },
  { key: "type", visible: true, order: 2, width: 130 },
  { key: "status", visible: true, order: 3, width: 120 },
  { key: "amount", visible: false, order: 4, width: 110 },
];
