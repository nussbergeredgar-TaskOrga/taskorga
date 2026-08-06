// Kleiner, bewusst begrenzter Satz an Bedingungen fuer eigene Kennzahlen/
// Diagramme -- kein Ersatz fuer das grosse Listen-Filter-System
// (lib/actions/filters.ts), das clientseitig ueber bereits geladene Listen
// mit reiner Gleichheits-Logik filtert. Hier wird serverseitig direkt in die
// Prisma-where-Klausel gefiltert (noetig, um nicht ganze Tabellen laden zu
// muessen), mit echten Operatoren fuer Zahlenfelder.
export type ReportFilterOperator = "eq" | "gt" | "gte" | "lt" | "lte" | "contains";

export type ReportFilterCondition = {
  field: string;
  fieldType: "number" | "text";
  operator: ReportFilterOperator;
  value: string;
};

export const NUMBER_OPERATORS: { value: ReportFilterOperator; label: string }[] = [
  { value: "eq", label: "ist genau" },
  { value: "gt", label: "größer als" },
  { value: "gte", label: "größer/gleich" },
  { value: "lt", label: "kleiner als" },
  { value: "lte", label: "kleiner/gleich" },
];

export const TEXT_OPERATORS: { value: ReportFilterOperator; label: string }[] = [
  { value: "eq", label: "ist genau" },
  { value: "contains", label: "enthält" },
];

// Baut die Bedingungen (UND-verknuepft) in ein bestehendes Prisma-where-
// Objekt ein. Die Feldauswahl kommt in der Oberflaeche immer aus einer
// kuratierten Liste (sumFields/groupableFields aus ENTITY_META) -- ein
// beliebiger Feldname wuerde sonst zu einem Laufzeitfehler in Prisma fuehren.
// Generisch gehalten (statt Record<string, unknown>), damit der spezifische
// Prisma-WhereInput-Typ des Aufrufers (z.B. InvoiceWhereInput) durch die
// Funktion hindurch erhalten bleibt -- sonst waere jede Aufrufstelle
// hinterher zu breit typisiert fuer .count()/.aggregate().
export function applyFilterConditions<T extends Record<string, unknown>>(
  where: T,
  conditions: ReportFilterCondition[] | null | undefined
): T {
  const target = where as Record<string, unknown>;
  for (const c of conditions ?? []) {
    if (!c.field || !c.value.trim()) continue;

    if (c.fieldType === "number") {
      const numeric = Number(c.value.replace(",", "."));
      if (!Number.isFinite(numeric)) continue;
      target[c.field] = c.operator === "eq" ? numeric : { [c.operator]: numeric };
    } else {
      target[c.field] =
        c.operator === "contains" ? { contains: c.value.trim(), mode: "insensitive" } : c.value.trim();
    }
  }
  return where;
}
