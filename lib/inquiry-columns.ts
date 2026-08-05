import type { ColumnConfig } from "@/lib/actions/list-view";

export type InquiryColumnKey = "customerName" | "stepLabel" | "status" | "source" | "amount" | "createdAt";

export const INQUIRY_COLUMN_LABELS: Record<InquiryColumnKey, string> = {
  customerName: "Kunde",
  stepLabel: "Schritt",
  status: "Status",
  source: "Quelle",
  amount: "Betrag",
  createdAt: "Erstellt am",
};

// "Kunde" (Link zum Kunden) ist immer sichtbar und fixiert (erste Spalte,
// analog zum Namen bei Kunden) -- alle anderen Spalten sind ein-/ausblendbar,
// umsortierbar und in der Breite anpassbar.
export const INQUIRY_COLUMNS_DEFAULT: ColumnConfig[] = [
  { key: "stepLabel", visible: true, order: 0, width: 160 },
  { key: "amount", visible: true, order: 1, width: 110 },
  { key: "source", visible: true, order: 2, width: 140 },
  { key: "createdAt", visible: true, order: 3, width: 120 },
  { key: "status", visible: false, order: 4, width: 140 },
];

export const INQUIRY_EDITABLE_FIELDS: InquiryColumnKey[] = ["source", "amount"];
