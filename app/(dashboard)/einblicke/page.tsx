import { requireAdmin } from "@/lib/session";

export default async function EinblickePage() {
  await requireAdmin();
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold text-ink-900">Einblicke</h1>
      <p className="text-sm text-ink-500">
        Kommt noch: Auswertungen, Cashflow-Diagramme, Pipeline-Übersicht.
      </p>
    </div>
  );
}
