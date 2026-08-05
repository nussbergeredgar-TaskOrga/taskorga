import type { ColumnConfig } from "@/lib/actions/list-view";

export type CustomerColumnKey =
  | "type"
  | "email"
  | "phone"
  | "address"
  | "zip"
  | "city"
  | "customerSince"
  | "projectsCount"
  | "invoicesCount";

export const CUSTOMER_COLUMN_LABELS: Record<CustomerColumnKey, string> = {
  type: "Typ",
  email: "E-Mail",
  phone: "Telefon",
  address: "Straße",
  zip: "PLZ",
  city: "Ort",
  customerSince: "Kunde seit",
  projectsCount: "Aufträge",
  invoicesCount: "Rechnungen",
};

// Der Name ist immer sichtbar und fixiert (erste Spalte, verlinkt zum
// Kundenprofil) -- alle anderen Spalten sind ein-/ausblendbar, umsortierbar
// und in der Breite anpassbar.
export const CUSTOMER_COLUMNS_DEFAULT: ColumnConfig[] = [
  { key: "type", visible: true, order: 0, width: 100 },
  { key: "email", visible: true, order: 1, width: 200 },
  { key: "phone", visible: true, order: 2, width: 140 },
  { key: "city", visible: true, order: 3, width: 140 },
  { key: "customerSince", visible: true, order: 4, width: 120 },
  { key: "projectsCount", visible: true, order: 5, width: 90 },
  { key: "invoicesCount", visible: true, order: 6, width: 100 },
  { key: "address", visible: false, order: 7, width: 180 },
  { key: "zip", visible: false, order: 8, width: 90 },
];

export const CUSTOMER_EDITABLE_FIELDS: CustomerColumnKey[] = ["type", "email", "phone", "address", "zip", "city"];
