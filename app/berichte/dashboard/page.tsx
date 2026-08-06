import Link from "next/link";
import { requirePermission } from "@/lib/session";
import { getCustomKpiValues } from "@/lib/actions/custom-kpi";
import { getCustomChartsWithData } from "@/lib/actions/custom-chart";
import { getDashboardLayout } from "@/lib/actions/dashboard";
import { CustomChart } from "@/components/charts/custom-chart";
import { PrintButton } from "@/components/print-button";

export default async function DashboardBerichtPage() {
  await requirePermission("einblicke");

  const [kpis, charts, layout] = await Promise.all([
    getCustomKpiValues(),
    getCustomChartsWithData(),
    getDashboardLayout(),
  ]);

  const onDashboardIds = new Set((layout ?? []).filter((w) => w.visible).map((w) => w.id));
  const selectedKpis = kpis.filter((k) => onDashboardIds.has(`custom:${k.id}`));
  const selectedCharts = charts.filter((c) => onDashboardIds.has(`chart:${c.id}`));
  const isEmpty = selectedKpis.length === 0 && selectedCharts.length === 0;

  return (
    <div className="min-h-screen bg-white p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div>
          <Link href="/einblicke" className="text-xs text-ink-500 hover:text-brand-700 hover:underline">
            ← Zurück zu Einblicke
          </Link>
          <h1 className="text-2xl font-semibold text-ink-900 mt-1">Bericht</h1>
          <p className="text-sm text-ink-500 mt-1">
            Zeigt die Kennzahlen und Diagramme, die aktuell auf dem Dashboard sichtbar sind.
          </p>
        </div>
        {!isEmpty && <PrintButton />}
      </div>

      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-semibold text-ink-900">TaskOrga — Bericht</h1>
        <p className="text-sm text-ink-500">
          {new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
        </p>
      </div>

      {isEmpty ? (
        <p className="text-sm text-ink-500">
          Noch keine Kennzahlen oder Diagramme auf dem Dashboard. Unter{" "}
          <Link href="/einblicke" className="text-brand-700 hover:underline">
            Einblicke
          </Link>{" "}
          können eigene Kennzahlen/Diagramme angelegt und über das Raster-Symbol zum Dashboard hinzugefügt werden —
          die erscheinen dann hier.
        </p>
      ) : (
        <>
          {selectedKpis.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 print:break-inside-avoid">
              {selectedKpis.map((kpi) => (
                <div key={kpi.id} className="rounded-card border border-ink-100 p-4">
                  <p className="text-xs text-ink-500">{kpi.label}</p>
                  <p className="text-xl font-semibold text-ink-900 font-mono">
                    {kpi.aggregation === "sum" ? `${kpi.value.toLocaleString("de-DE")} €` : kpi.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {selectedCharts.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-6">
              {selectedCharts.map((chart) => (
                <div key={chart.id} className="rounded-card border border-ink-100 p-4 print:break-inside-avoid">
                  <h2 className="font-display font-semibold text-ink-900 mb-2">{chart.label}</h2>
                  <CustomChart
                    chartType={chart.chartType as "bar" | "line" | "pie" | "area"}
                    data={chart.data}
                    valueSuffix={chart.aggregation === "sum" ? " €" : undefined}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
