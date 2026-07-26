import { requireAdmin } from "@/lib/session";
import { getCustomKpiValues } from "@/lib/actions/custom-kpi";
import { getDashboardLayout } from "@/lib/actions/dashboard";
import { KpiManager } from "@/components/kpi-manager";

export default async function EinblickePage() {
  await requireAdmin();

  const [kpis, layout] = await Promise.all([getCustomKpiValues(), getDashboardLayout()]);
  const onDashboardIds = new Set((layout ?? []).filter((w) => w.visible).map((w) => w.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Einblicke</h1>
        <p className="text-sm text-ink-500 mt-1">
          Eigene Kennzahlen aus deinen Daten erstellen und aufs Dashboard holen.
        </p>
      </div>

      <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card max-w-2xl">
        <h2 className="font-display font-semibold text-ink-900 mb-1">Kennzahlen</h2>
        <p className="text-sm text-ink-500 mb-4">
          Wähle einen Datentyp, eine Berechnung (Anzahl oder Betrag) und optional einen
          Status-Filter. Über „Zum Dashboard hinzufügen" erscheint die Kachel auf „Heute".
        </p>
        <KpiManager
          kpis={kpis.map((k) => ({
            id: k.id,
            label: k.label,
            entity: k.entity,
            aggregation: k.aggregation,
            statusValue: k.statusValue,
            value: k.value,
            onDashboard: onDashboardIds.has(`custom:${k.id}`),
          }))}
        />
      </div>
    </div>
  );
}
