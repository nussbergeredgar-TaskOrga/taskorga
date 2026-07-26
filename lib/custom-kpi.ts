export type EntityKey =
  | "customers"
  | "inquiries"
  | "quotes"
  | "projects"
  | "invoices"
  | "appointments"
  | "expenses";

export const ENTITY_META: Record<
  EntityKey,
  {
    label: string;
    sumFields: { key: string; label: string }[];
    statusOptions: { value: string; label: string }[];
  }
> = {
  customers: { label: "Kunden", sumFields: [], statusOptions: [] },
  inquiries: {
    label: "Anfragen",
    sumFields: [{ key: "amount", label: "Betrag" }],
    statusOptions: [
      { value: "NEW", label: "Neu" },
      { value: "CALLBACK_SCHEDULED", label: "Rückruf geplant" },
      { value: "CALL_DONE", label: "Telefonat erfolgt" },
      { value: "QUOTE_CREATED", label: "Angebot erstellt" },
      { value: "WON", label: "Gewonnen" },
      { value: "LOST", label: "Verloren" },
    ],
  },
  quotes: {
    label: "Angebote",
    sumFields: [{ key: "totalGross", label: "Betrag brutto" }],
    statusOptions: [
      { value: "DRAFT", label: "Entwurf" },
      { value: "SENT", label: "Versendet" },
      { value: "ACCEPTED", label: "Angenommen" },
      { value: "REJECTED", label: "Abgelehnt" },
      { value: "EXPIRED", label: "Abgelaufen" },
    ],
  },
  projects: {
    label: "Aufträge",
    sumFields: [],
    statusOptions: [
      { value: "PLANNED", label: "Geplant" },
      { value: "IN_PROGRESS", label: "In Arbeit" },
      { value: "DONE", label: "Abgeschlossen" },
      { value: "CANCELLED", label: "Storniert" },
    ],
  },
  invoices: {
    label: "Rechnungen",
    sumFields: [{ key: "totalGross", label: "Betrag brutto" }],
    statusOptions: [
      { value: "DRAFT", label: "Entwurf" },
      { value: "SENT", label: "Versendet" },
      { value: "OPEN", label: "Offen" },
      { value: "PARTIALLY_PAID", label: "Teilbezahlt" },
      { value: "PAID", label: "Bezahlt" },
      { value: "OVERDUE", label: "Überfällig" },
      { value: "CANCELLED", label: "Storniert" },
    ],
  },
  appointments: {
    label: "Termine",
    sumFields: [{ key: "amount", label: "Betrag" }],
    statusOptions: [
      { value: "REQUESTED", label: "Angefragt" },
      { value: "SCHEDULED", label: "Geplant" },
      { value: "DONE", label: "Erledigt" },
      { value: "CANCELLED", label: "Storniert" },
    ],
  },
  expenses: {
    label: "Ausgaben",
    sumFields: [{ key: "amount", label: "Betrag" }],
    statusOptions: [
      { value: "OPEN", label: "Offen" },
      { value: "PAID", label: "Bezahlt" },
    ],
  },
};

export const ENTITY_KEYS = Object.keys(ENTITY_META) as EntityKey[];
