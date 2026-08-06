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
    // Freie Textfelder (kein fester Wertevorrat wie bei Status) -- gruppierbar
    // per groupBy() statt der festen Werteliste, siehe computeFieldBuckets().
    groupableFields: { key: string; label: string }[];
  }
> = {
  customers: { label: "Kunden", sumFields: [], statusOptions: [], groupableFields: [] },
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
    groupableFields: [{ key: "source", label: "Quelle" }],
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
    groupableFields: [],
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
    groupableFields: [],
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
    groupableFields: [],
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
    groupableFields: [{ key: "type", label: "Art" }],
  },
  expenses: {
    label: "Ausgaben",
    sumFields: [{ key: "amount", label: "Betrag" }],
    statusOptions: [
      { value: "OPEN", label: "Offen" },
      { value: "PAID", label: "Bezahlt" },
    ],
    groupableFields: [{ key: "category", label: "Kategorie" }],
  },
};

export const ENTITY_KEYS = Object.keys(ENTITY_META) as EntityKey[];

// Kuratierte Liste der Felder, auf die eine zusaetzliche Bedingung (siehe
// lib/report-filters.ts) gesetzt werden darf -- bewusst nur Summenfelder
// (Zahl) und gruppierbare Textfelder, keine beliebigen Spaltennamen.
export function filterableFieldsFor(
  entity: EntityKey
): { key: string; label: string; type: "number" | "text" }[] {
  const meta = ENTITY_META[entity];
  return [
    ...meta.sumFields.map((f) => ({ key: f.key, label: f.label, type: "number" as const })),
    ...meta.groupableFields.map((f) => ({ key: f.key, label: f.label, type: "text" as const })),
  ];
}

// Auf welches Datumsfeld sich das Zeitfenster je Datentyp bezieht
export const DATE_FIELD_BY_ENTITY: Record<EntityKey, string> = {
  customers: "customerSince",
  inquiries: "createdAt",
  quotes: "createdAt",
  projects: "createdAt",
  invoices: "createdAt",
  appointments: "scheduledAt",
  expenses: "date",
};

export const DATE_RANGE_OPTIONS: { value: string; label: string }[] = [
  { value: "ALL", label: "Gesamter Zeitraum" },
  { value: "TODAY", label: "Heute" },
  { value: "THIS_WEEK", label: "Diese Woche" },
  { value: "THIS_MONTH", label: "Dieser Monat" },
  { value: "THIS_YEAR", label: "Dieses Jahr" },
  { value: "CUSTOM", label: "Fester Zeitraum" },
];
