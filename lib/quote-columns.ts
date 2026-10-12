import type { ColumnConfig } from "@/lib/actions/list-view";

export type QuoteColumnKey = "customerName" | "number" | "status" | "totalGross" | "validUntil" | "createdAt" | "tags";

export const QUOTE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Entwurf",
  SENT: "Versendet",
  ACCEPTED: "Angenommen",
  REJECTED: "Abgelehnt",
  EXPIRED: "Abgelaufen",
};

export const QUOTE_COLUMN_LABELS: Record<QuoteColumnKey, string> = {
  customerName: "Kunde",
  number: "Nummer",
  status: "Status",
  totalGross: "Betrag (brutto)",
  validUntil: "Gültig bis",
  createdAt: "Erstellt am",
  tags: "Tags",
};

// "Titel" (Link zum Angebot) ist immer sichtbar und fixiert -- alle anderen
// Spalten sind ein-/ausblendbar, umsortierbar und in der Breite anpassbar.
export const QUOTE_COLUMNS_DEFAULT: ColumnConfig[] = [
  { key: "customerName", visible: true, order: 0, width: 180 },
  { key: "number", visible: true, order: 1, width: 110 },
  { key: "status", visible: true, order: 2, width: 120 },
  { key: "totalGross", visible: true, order: 3, width: 130 },
  { key: "validUntil", visible: false, order: 4, width: 120 },
  { key: "createdAt", visible: false, order: 5, width: 120 },
  { key: "tags", visible: true, order: 10, width: 180 },
];

export const QUOTE_EDITABLE_FIELDS: QuoteColumnKey[] = [];
