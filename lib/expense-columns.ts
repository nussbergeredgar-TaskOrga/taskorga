import type { ColumnConfig } from "@/lib/actions/list-view";

export type ExpenseColumnKey = "category" | "amount" | "date" | "status" | "projectNumber";

export const EXPENSE_STATUS_LABELS: Record<string, string> = {
  OPEN: "Offen",
  PAID: "Bezahlt",
};

export const EXPENSE_COLUMN_LABELS: Record<ExpenseColumnKey, string> = {
  category: "Kategorie",
  amount: "Betrag",
  date: "Datum",
  status: "Status",
  projectNumber: "Auftrag",
};

// "Titel" (Link/Text) ist immer sichtbar und fixiert -- alle anderen Spalten
// sind ein-/ausblendbar, umsortierbar und in der Breite anpassbar.
export const EXPENSE_COLUMNS_DEFAULT: ColumnConfig[] = [
  { key: "status", visible: true, order: 0, width: 110 },
  { key: "amount", visible: true, order: 1, width: 110 },
  { key: "date", visible: true, order: 2, width: 110 },
  { key: "category", visible: true, order: 3, width: 130 },
  { key: "projectNumber", visible: false, order: 4, width: 120 },
];
