export type EntityKey =
  | "customers"
  | "inquiries"
  | "quotes"
  | "projects"
  | "invoices"
  | "appointments"
  | "expenses";

export type FieldKind = "enum" | "text" | "number" | "date" | "relation";

export type EnumFieldOption = { value: string; label: string };

// "customer" -> lib/actions/custom-chart.ts loest per prisma.customer.findMany
// zu Kundennamen auf, "project" -> Auftragsnummer, "user" -> Nutzername.
export type RelationModel = "customer" | "project" | "user";

export type FieldCatalogEntry =
  | { key: string; label: string; kind: "enum"; options: EnumFieldOption[] }
  | { key: string; label: string; kind: "text" }
  | { key: string; label: string; kind: "number" }
  | { key: string; label: string; kind: "date" }
  | { key: string; label: string; kind: "relation"; relationModel: RelationModel };

// Vollstaendiger, pro Datentyp gepflegter Feldkatalog -- jedes Feld traegt
// seine Art (kind), die in lib/actions/custom-chart.ts bestimmt, WIE dafuer
// gruppiert wird (feste Werteliste inkl. 0-Werten bei "enum", Top-8 +
// "Sonstige" bei "text"/"relation", gleich breite Wertebereiche bei "number",
// Zeitraum-Buckets bei "date"). Bewusst nicht jedes Prisma-Feld: reine
// Fliesstext-Felder (description, notes, title) und rein interne IDs bleiben
// aussen vor, ebenso taxRate (Prozentsatz, keine sinnvolle Gruppierungs-/
// Summengroesse).
export const ENTITY_META: Record<EntityKey, { label: string; fields: FieldCatalogEntry[] }> = {
  customers: {
    label: "Kunden",
    fields: [
      {
        key: "type",
        label: "Kundentyp",
        kind: "enum",
        options: [
          { value: "PRIVATE", label: "Privat" },
          { value: "BUSINESS", label: "Geschäft" },
        ],
      },
      {
        key: "salutation",
        label: "Anrede",
        kind: "enum",
        options: [
          { value: "HERR", label: "Herr" },
          { value: "FRAU", label: "Frau" },
          { value: "DIVERS", label: "Divers" },
        ],
      },
      { key: "city", label: "Ort", kind: "text" },
      { key: "country", label: "Land", kind: "text" },
      { key: "customerSince", label: "Kunde seit", kind: "date" },
      { key: "archivedAt", label: "Archiviert am", kind: "date" },
      { key: "createdAt", label: "Angelegt am", kind: "date" },
      { key: "updatedAt", label: "Zuletzt geändert", kind: "date" },
    ],
  },
  inquiries: {
    label: "Anfragen",
    fields: [
      {
        key: "status",
        label: "Status",
        kind: "enum",
        options: [
          { value: "NEW", label: "Neu" },
          { value: "CALLBACK_SCHEDULED", label: "Rückruf geplant" },
          { value: "CALL_DONE", label: "Telefonat erfolgt" },
          { value: "QUOTE_CREATED", label: "Angebot erstellt" },
          { value: "WON", label: "Gewonnen" },
          { value: "LOST", label: "Verloren" },
        ],
      },
      { key: "source", label: "Quelle", kind: "text" },
      { key: "lostReason", label: "Verlustgrund", kind: "text" },
      { key: "amount", label: "Betrag", kind: "number" },
      { key: "createdAt", label: "Angelegt am", kind: "date" },
      { key: "updatedAt", label: "Zuletzt geändert", kind: "date" },
      { key: "customerId", label: "Kunde", kind: "relation", relationModel: "customer" },
    ],
  },
  quotes: {
    label: "Angebote",
    fields: [
      {
        key: "status",
        label: "Status",
        kind: "enum",
        options: [
          { value: "DRAFT", label: "Entwurf" },
          { value: "SENT", label: "Versendet" },
          { value: "ACCEPTED", label: "Angenommen" },
          { value: "REJECTED", label: "Abgelehnt" },
          { value: "EXPIRED", label: "Abgelaufen" },
        ],
      },
      {
        key: "discountType",
        label: "Rabattart",
        kind: "enum",
        options: [
          { value: "AMOUNT", label: "Betrag" },
          { value: "PERCENT", label: "Prozent" },
        ],
      },
      { key: "totalGross", label: "Betrag brutto", kind: "number" },
      { key: "totalNet", label: "Betrag netto", kind: "number" },
      { key: "discountValue", label: "Rabatt", kind: "number" },
      { key: "createdAt", label: "Angelegt am", kind: "date" },
      { key: "validUntil", label: "Gültig bis", kind: "date" },
      { key: "updatedAt", label: "Zuletzt geändert", kind: "date" },
      { key: "customerId", label: "Kunde", kind: "relation", relationModel: "customer" },
    ],
  },
  projects: {
    label: "Aufträge",
    fields: [
      {
        key: "status",
        label: "Status",
        kind: "enum",
        options: [
          { value: "PLANNED", label: "Geplant" },
          { value: "IN_PROGRESS", label: "In Arbeit" },
          { value: "DONE", label: "Abgeschlossen" },
          { value: "CANCELLED", label: "Storniert" },
        ],
      },
      { key: "cancelReason", label: "Stornogrund", kind: "text" },
      { key: "createdAt", label: "Angelegt am", kind: "date" },
      { key: "startDate", label: "Startdatum", kind: "date" },
      { key: "endDate", label: "Enddatum", kind: "date" },
      { key: "updatedAt", label: "Zuletzt geändert", kind: "date" },
      { key: "customerId", label: "Kunde", kind: "relation", relationModel: "customer" },
    ],
  },
  invoices: {
    label: "Rechnungen",
    fields: [
      {
        key: "status",
        label: "Status",
        kind: "enum",
        options: [
          { value: "DRAFT", label: "Entwurf" },
          { value: "SENT", label: "Versendet" },
          { value: "OPEN", label: "Offen" },
          { value: "PARTIALLY_PAID", label: "Teilbezahlt" },
          { value: "PAID", label: "Bezahlt" },
          { value: "OVERDUE", label: "Überfällig" },
          { value: "CANCELLED", label: "Storniert" },
        ],
      },
      {
        key: "discountType",
        label: "Rabattart",
        kind: "enum",
        options: [
          { value: "AMOUNT", label: "Betrag" },
          { value: "PERCENT", label: "Prozent" },
        ],
      },
      { key: "totalGross", label: "Betrag brutto", kind: "number" },
      { key: "totalNet", label: "Betrag netto", kind: "number" },
      { key: "paidAmount", label: "Bezahlter Betrag", kind: "number" },
      { key: "discountValue", label: "Rabatt", kind: "number" },
      { key: "createdAt", label: "Angelegt am", kind: "date" },
      { key: "issueDate", label: "Rechnungsdatum", kind: "date" },
      { key: "dueDate", label: "Fällig am", kind: "date" },
      { key: "paidAt", label: "Bezahlt am", kind: "date" },
      { key: "lastReminderSentAt", label: "Letzte Mahnung", kind: "date" },
      { key: "updatedAt", label: "Zuletzt geändert", kind: "date" },
      { key: "customerId", label: "Kunde", kind: "relation", relationModel: "customer" },
      { key: "projectId", label: "Auftrag", kind: "relation", relationModel: "project" },
    ],
  },
  appointments: {
    label: "Termine",
    fields: [
      {
        key: "status",
        label: "Status",
        kind: "enum",
        options: [
          { value: "REQUESTED", label: "Angefragt" },
          { value: "SCHEDULED", label: "Geplant" },
          { value: "DONE", label: "Erledigt" },
          { value: "CANCELLED", label: "Storniert" },
        ],
      },
      { key: "type", label: "Art", kind: "text" },
      { key: "cancelReason", label: "Stornogrund", kind: "text" },
      { key: "cancelledBy", label: "Storniert von", kind: "text" },
      { key: "amount", label: "Betrag", kind: "number" },
      { key: "scheduledAt", label: "Termin am", kind: "date" },
      { key: "requestedAt", label: "Angefragt am", kind: "date" },
      { key: "endAt", label: "Ende", kind: "date" },
      { key: "createdAt", label: "Angelegt am", kind: "date" },
      { key: "updatedAt", label: "Zuletzt geändert", kind: "date" },
      { key: "customerId", label: "Kunde", kind: "relation", relationModel: "customer" },
      { key: "assigneeId", label: "Mitarbeiter", kind: "relation", relationModel: "user" },
    ],
  },
  expenses: {
    label: "Ausgaben",
    fields: [
      {
        key: "status",
        label: "Status",
        kind: "enum",
        options: [
          { value: "OPEN", label: "Offen" },
          { value: "PAID", label: "Bezahlt" },
        ],
      },
      { key: "category", label: "Kategorie", kind: "text" },
      { key: "amount", label: "Betrag", kind: "number" },
      { key: "date", label: "Datum", kind: "date" },
      { key: "paidAt", label: "Bezahlt am", kind: "date" },
      { key: "createdAt", label: "Angelegt am", kind: "date" },
      { key: "updatedAt", label: "Zuletzt geändert", kind: "date" },
      { key: "projectId", label: "Auftrag", kind: "relation", relationModel: "project" },
    ],
  },
};

export const ENTITY_KEYS = Object.keys(ENTITY_META) as EntityKey[];

export function fieldFor(entity: EntityKey, key: string): FieldCatalogEntry | undefined {
  return ENTITY_META[entity].fields.find((f) => f.key === key);
}

function fieldsOfKind(entity: EntityKey, kind: FieldKind): FieldCatalogEntry[] {
  return ENTITY_META[entity].fields.filter((f) => f.kind === kind);
}

export function enumFieldsFor(entity: EntityKey): FieldCatalogEntry[] {
  return fieldsOfKind(entity, "enum");
}
export function textFieldsFor(entity: EntityKey): FieldCatalogEntry[] {
  return fieldsOfKind(entity, "text");
}
export function numberFieldsFor(entity: EntityKey): FieldCatalogEntry[] {
  return fieldsOfKind(entity, "number");
}
export function dateFieldsFor(entity: EntityKey): FieldCatalogEntry[] {
  return fieldsOfKind(entity, "date");
}
export function relationFieldsFor(entity: EntityKey): FieldCatalogEntry[] {
  return fieldsOfKind(entity, "relation");
}

// Ersetzt das frühere ENTITY_META[entity].statusOptions -- der Wertevorrat
// des (immer gleich benannten) "status"-Felds, falls vorhanden.
export function statusOptionsFor(entity: EntityKey): EnumFieldOption[] {
  const field = fieldFor(entity, "status");
  return field && field.kind === "enum" ? field.options : [];
}

// Sinnvolle Vorbelegung fuer ein neu erstelltes Diagramm: bevorzugt Status,
// sonst das erste Datums-, Text-, Enum- oder Zahlenfeld.
export function defaultGroupByFieldFor(entity: EntityKey): string {
  const status = fieldFor(entity, "status");
  if (status) return status.key;
  const candidates = [
    ...dateFieldsFor(entity),
    ...textFieldsFor(entity),
    ...enumFieldsFor(entity),
    ...numberFieldsFor(entity),
  ];
  return candidates[0]?.key ?? "createdAt";
}

// Kuratierte Liste der Felder, auf die eine zusaetzliche Bedingung (siehe
// lib/report-filters.ts) gesetzt werden darf: Zahl, Text und Datum. Enum- und
// Verknuepfungsfelder bewusst nicht dabei -- der bestehende "enthält"-
// Textoperator wuerde bei einem Prisma-Enum zur Laufzeit fehlschlagen; ein
// eigener Enum-Operator waere ein sauberer, aber separater Ausbauschritt.
export function filterableFieldsFor(
  entity: EntityKey
): { key: string; label: string; type: "number" | "text" | "date" }[] {
  return [
    ...numberFieldsFor(entity).map((f) => ({ key: f.key, label: f.label, type: "number" as const })),
    ...textFieldsFor(entity).map((f) => ({ key: f.key, label: f.label, type: "text" as const })),
    ...dateFieldsFor(entity).map((f) => ({ key: f.key, label: f.label, type: "date" as const })),
  ];
}

// Auf welches Datumsfeld sich das KPI-Zeitfenster standardmaessig bezieht,
// wenn kein eigenes dateField gewaehlt wurde (CustomKpi.dateField === null).
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

export type DateGranularity = "day" | "week" | "month" | "quarter" | "year";

export const GRANULARITY_LABELS: Record<DateGranularity, string> = {
  day: "Tag",
  week: "Woche",
  month: "Monat",
  quarter: "Quartal",
  year: "Jahr",
};

export const DEFAULT_WINDOW_COUNT: Record<DateGranularity, number> = {
  day: 14,
  week: 8,
  month: 6,
  quarter: 4,
  year: 5,
};

// Grenzen fuer die Eingabefelder in der Oberflaeche -- verhindert z.B. ein
// Diagramm mit 400 Tages-Balken.
export const MAX_WINDOW_COUNT: Record<DateGranularity, number> = {
  day: 60,
  week: 26,
  month: 24,
  quarter: 12,
  year: 10,
};

export const DEFAULT_BUCKET_COUNT = 6;
export const MIN_BUCKET_COUNT = 2;
export const MAX_BUCKET_COUNT = 12;

export type GroupByConfig = { granularity: DateGranularity; windowCount: number } | { bucketCount: number } | null;
