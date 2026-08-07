import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { getCustomKpiValues } from "@/lib/actions/custom-kpi";
import { getCustomChartsWithData } from "@/lib/actions/custom-chart";
import { getDashboardLayout } from "@/lib/actions/dashboard";
import { computeRevenue } from "@/lib/revenue";
import { KpiManager } from "@/components/kpi-manager";
import { ChartManager } from "@/components/chart-manager";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { PipelineChart } from "@/components/charts/pipeline-chart";
import { InvoiceStatusChart } from "@/components/charts/invoice-status-chart";
import Link from "next/link";
import { FileText } from "lucide-react";

const PIPELINE_LABELS: Record<string, string> = {
  NEW: "Neu",
  CALLBACK_SCHEDULED: "Rückruf geplant",
  CALL_DONE: "Telefonat erfolgt",
  QUOTE_CREATED: "Angebot erstellt",
  WON: "Gewonnen",
  LOST: "Verloren",
};
const PIPELINE_ORDER = ["NEW", "CALLBACK_SCHEDULED", "CALL_DONE", "QUOTE_CREATED", "WON", "LOST"];

function monthLabel(date: Date) {
  return date.toLocaleDateString("de-DE", { month: "short", year: "2-digit" });
}

export default async function EinblickePage() {
  const admin = await requirePermission("einblicke");
  const companyId = admin.companyId;

  const monthRanges: { label: string; gte: Date; lte: Date }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    monthRanges.push({
      label: monthLabel(d),
      gte: new Date(d.getFullYear(), d.getMonth(), 1),
      lte: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999),
    });
  }

  const [kpis, customCharts, layout, monthlyRevenue, inquiryCounts, invoiceSums] = await Promise.all([
    getCustomKpiValues(),
    getCustomChartsWithData(),
    getDashboardLayout(),
    Promise.all(monthRanges.map((r) => computeRevenue(companyId, { gte: r.gte, lte: r.lte }))),
    prisma.inquiry.groupBy({
      by: ["status"],
      where: { companyId },
      _count: true,
    }),
    Promise.all([
      prisma.invoice.aggregate({ where: { companyId, status: "PAID" }, _sum: { totalGross: true } }),
      prisma.invoice.aggregate({
        where: { companyId, status: { in: ["SENT", "OPEN", "PARTIALLY_PAID"] } },
        _sum: { totalGross: true },
      }),
      prisma.invoice.aggregate({ where: { companyId, status: "OVERDUE" }, _sum: { totalGross: true } }),
    ]),
  ]);

  const onDashboardIds = new Set((layout ?? []).filter((w) => w.visible).map((w) => w.id));

  // Umsatz pro Monat (letzte 6 Monate) aus der konfigurierbaren Umsatz-Zusammensetzung
  const monthBuckets = monthRanges.map((r, i) => ({ month: r.label, umsatz: monthlyRevenue[i] }));

  // Pipeline: feste Reihenfolge, auch Status mit 0 Anfragen anzeigen
  const countByStatus = new Map(inquiryCounts.map((c) => [c.status, c._count]));
  const pipelineData = PIPELINE_ORDER.map((status) => ({
    label: PIPELINE_LABELS[status],
    anzahl: countByStatus.get(status as any) ?? 0,
  }));

  const [paidAgg, openAgg, overdueAgg] = invoiceSums;
  const invoiceStatusData = [
    { name: "Bezahlt", value: Number(paidAgg._sum.totalGross ?? 0) },
    { name: "Offen", value: Number(openAgg._sum.totalGross ?? 0) },
    { name: "Überfällig", value: Number(overdueAgg._sum.totalGross ?? 0) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Einblicke</h1>
          <p className="text-sm text-ink-500 mt-1">
            Auswertungen aus deinen Daten, plus eigene Kennzahlen und Diagramme fürs Dashboard.
          </p>
        </div>
        <Link
          href="/berichte/dashboard"
          className="flex items-center gap-1.5 shrink-0 rounded-lg border border-ink-100 text-ink-700 text-sm font-medium px-4 py-2.5 hover:bg-ink-50 transition-colors"
        >
          <FileText size={15} />
          Bericht ansehen
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card">
          <h2 className="font-display font-semibold text-ink-900 mb-4">Umsatz (letzte 6 Monate)</h2>
          <RevenueChart data={monthBuckets} />
        </div>

        <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card">
          <h2 className="font-display font-semibold text-ink-900 mb-4">Rechnungen nach Status</h2>
          <InvoiceStatusChart data={invoiceStatusData} />
        </div>

        <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card lg:col-span-2">
          <h2 className="font-display font-semibold text-ink-900 mb-4">Anfragen-Pipeline</h2>
          <PipelineChart data={pipelineData} />
        </div>
      </div>

      <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card max-w-2xl">
        <h2 className="font-display font-semibold text-ink-900 mb-1">Kennzahlen</h2>
        <p className="text-sm text-ink-500 mb-4">
          Wähle einen Datentyp, eine Berechnung (Anzahl oder Betrag eines beliebigen Feldes) und
          optional einen Status-/Zeitraum-Filter. Über „Zum Dashboard hinzufügen" erscheint die
          Kachel auf „Heute".
        </p>
        <KpiManager
          kpis={kpis.map((k) => ({
            id: k.id,
            label: k.label,
            entity: k.entity,
            aggregation: k.aggregation,
            sumField: k.sumField,
            statusValue: k.statusValue,
            dateRangeType: k.dateRangeType,
            dateFrom: k.dateFrom,
            dateTo: k.dateTo,
            dateField: k.dateField,
            filterConditions: k.filterConditions,
            value: k.value,
            onDashboard: onDashboardIds.has(`custom:${k.id}`),
          }))}
        />
      </div>

      <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card">
        <h2 className="font-display font-semibold text-ink-900 mb-1">Eigene Diagramme</h2>
        <p className="text-sm text-ink-500 mb-4">
          Wähle einen Datentyp, einen Diagrammtyp (Balken/Linie/Fläche/Kreis) und ein beliebiges
          Feld zum Gruppieren -- bei Datum mit wählbarer Granularität/Zeitraum, bei Zahlen mit
          wählbaren Wertebereichen -- optional mit weiteren Bedingungen. Über das Raster-Symbol
          erscheint das Diagramm auch auf „Heute".
        </p>
        <ChartManager
          charts={customCharts.map((c) => ({
            id: c.id,
            label: c.label,
            entity: c.entity,
            chartType: c.chartType,
            groupByField: c.groupByField,
            groupByConfig: c.groupByConfig,
            aggregation: c.aggregation,
            sumField: c.sumField,
            filterConditions: c.filterConditions,
            data: c.data,
            onDashboard: onDashboardIds.has(`chart:${c.id}`),
          }))}
        />
      </div>
    </div>
  );
}
