import type { EntityKey } from "@/lib/custom-kpi";

// Wohin ein Datentyp fuehrt, wenn man auf eine Kennzahl/einen Diagrammbalken klickt.
const ENTITY_LIST_PATH: Record<EntityKey, string> = {
  customers: "/kunden",
  inquiries: "/anfragen",
  quotes: "/angebote",
  projects: "/arbeit",
  invoices: "/finanzen",
  appointments: "/termine",
  expenses: "/finanzen",
};

// Baut die Ziel-URL fuer einen Datentyp + optionalen Status. Nicht jede Zielseite
// unterstuetzt Status-Filter (z.B. Ausgaben leben eingebettet in Finanzen) — dort
// wird einfach auf die allgemeine Seite verlinkt.
export function entityStatusHref(entity: EntityKey, status?: string | null): string {
  const base = ENTITY_LIST_PATH[entity];
  if (!status) return base;

  if (entity === "inquiries") {
    if (status === "WON") return "/anfragen/gewonnen";
    if (status === "LOST") return "/anfragen/verloren";
    return base;
  }

  if (entity === "expenses" || entity === "customers") return base;

  return `${base}?status=${encodeURIComponent(status)}`;
}
