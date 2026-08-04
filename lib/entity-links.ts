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

// Baut die Ziel-URL fuer einen Datentyp + optionalen Status.
export function entityStatusHref(entity: EntityKey, status?: string | null): string {
  const base = ENTITY_LIST_PATH[entity];
  if (!status) return base;

  if (entity === "inquiries") {
    if (status === "WON") return "/anfragen/gewonnen";
    if (status === "LOST") return "/anfragen/verloren";
    return base;
  }

  // Ausgaben leben eingebettet in Finanzen, mit eigenem Query-Parameter statt
  // "status" (der dort bereits fuer Rechnungen verwendet wird).
  if (entity === "expenses") return `${base}?expenseStatus=${encodeURIComponent(status)}`;

  if (entity === "customers") return base;

  return `${base}?status=${encodeURIComponent(status)}`;
}
