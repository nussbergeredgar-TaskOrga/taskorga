import type { ColumnConfig } from "@/lib/actions/list-view";

export type InvoiceColumnKey = "customerName" | "status" | "totalGross" | "dueDate" | "createdAt";

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Entwurf",
  SENT: "Versendet",
  OPEN: "Offen",
  PARTIALLY_PAID: "Teilbezahlt",
  PAID: "Bezahlt",
  OVERDUE: "Überfällig",
  CANCELLED: "Storniert",
};

export const INVOICE_COLUMN_LABELS: Record<InvoiceColumnKey, string> = {
  customerName: "Kunde",
  status: "Status",
  totalGross: "Betrag (brutto)",
  dueDate: "Fällig am",
  createdAt: "Erstellt am",
};

// "Nummer" (Link zur Rechnung) ist immer sichtbar und fixiert -- alle
// anderen Spalten sind ein-/ausblendbar, umsortierbar und in der Breite
// anpassbar.
export const INVOICE_COLUMNS_DEFAULT: ColumnConfig[] = [
  { key: "customerName", visible: true, order: 0, width: 180 },
  { key: "status", visible: true, order: 1, width: 120 },
  { key: "totalGross", visible: true, order: 2, width: 130 },
  { key: "dueDate", visible: true, order: 3, width: 120 },
  { key: "createdAt", visible: false, order: 4, width: 120 },
];
