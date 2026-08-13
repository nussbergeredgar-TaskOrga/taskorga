import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany, getCurrentUser } from "@/lib/session";
import { DashboardGrid } from "@/components/dashboard-grid";
import { DashboardSwitcher } from "@/components/dashboard-switcher";
import { OnboardingWelcome } from "@/components/onboarding-welcome";
import { getDashboardLayout, getDashboards } from "@/lib/actions/dashboard";
import { getCustomKpiValues } from "@/lib/actions/custom-kpi";
import { getCustomChartsWithData } from "@/lib/actions/custom-chart";
import { CustomChart } from "@/components/charts/custom-chart";
import { getActivities } from "@/lib/actions/activity-feed";
import { ActivityFeed } from "@/components/activity-feed";
import { entityStatusHref } from "@/lib/entity-links";
import type { EntityKey } from "@/lib/custom-kpi";
import { DEFAULT_WIDGETS } from "@/lib/dashboard-widgets";
import { format, isSameDay, startOfDay, endOfDay } from "date-fns";
import { computeRevenue } from "@/lib/revenue";

export default async function HeutePage({
  searchParams,
}: {
  searchParams: { dashboard?: string };
}) {
  const company = await getCurrentCompany();
  const user = await getCurrentUser();
  const dashboards = await getDashboards();
  const activeDashboardId = searchParams.dashboard ?? dashboards[0]?.id ?? null;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    openTasksCount,
    openInvoices,
    paidThisMonth,
    newInquiriesThisMonth,
    openTasks,
    recentActivities,
    upcomingAppointments,
    wonAgg,
    lostAgg,
    todayAppointmentsCount,
    scheduledAppointmentsAgg,
    openQuotesCount,
    sentQuotesAgg,
    savedLayout,
    customKpis,
    customCharts,
    customerCount,
  ] = await Promise.all([
    prisma.task.count({
      where: { companyId: company.id, status: { in: ["OPEN", "IN_PROGRESS"] } },
    }),
    prisma.invoice.aggregate({
      where: { companyId: company.id, status: { in: ["SENT", "OPEN", "PARTIALLY_PAID", "OVERDUE"] } },
      _sum: { totalGross: true },
    }),
    computeRevenue(company.id, { gte: startOfMonth }),
    prisma.inquiry.count({
      where: { companyId: company.id, createdAt: { gte: startOfMonth } },
    }),
    prisma.task.findMany({
      where: { companyId: company.id, status: { in: ["OPEN", "IN_PROGRESS"] } },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        project: { select: { title: true, id: true } },
        customer: { select: { name: true, id: true } },
        appointment: { select: { title: true, id: true } },
        inquiry: { select: { title: true, id: true } },
        quote: { select: { number: true, id: true } },
        invoice: { select: { number: true, id: true } },
      },
    }),
    getActivities({ take: 7 }),
    prisma.appointment.findMany({
      where: { companyId: company.id, scheduledAt: { gte: new Date() } },
      orderBy: { scheduledAt: "asc" },
      take: 5,
      include: { customer: { select: { id: true, name: true } } },
    }),
    prisma.inquiry.aggregate({
      where: { companyId: company.id, status: "WON" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.inquiry.aggregate({
      where: { companyId: company.id, status: "LOST" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.appointment.count({
      where: { companyId: company.id, scheduledAt: { gte: startOfDay(new Date()), lte: endOfDay(new Date()) } },
    }),
    prisma.appointment.aggregate({
      where: { companyId: company.id, status: "SCHEDULED" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.quote.count({
      where: { companyId: company.id, status: { in: ["DRAFT", "SENT"] } },
    }),
    prisma.quote.aggregate({
      where: { companyId: company.id, status: "SENT" },
      _sum: { totalGross: true },
      _count: true,
    }),
    getDashboardLayout(activeDashboardId),
    getCustomKpiValues(),
    getCustomChartsWithData(),
    prisma.customer.count({ where: { companyId: company.id } }),
  ]);

  const customKpiWidgetIds = customKpis.map((k) => `custom:${k.id}`);
  const customChartWidgetIds = customCharts.map((c) => `chart:${c.id}`);
  const allDefaultIds = [...DEFAULT_WIDGETS.map((w) => w.id), ...customKpiWidgetIds, ...customChartWidgetIds];

  // Neue Standard-Kacheln und neu erstellte eigene Kacheln ergänzen, falls sie
  // in der gespeicherten Konfiguration noch fehlen. Gelöschte eigene Kacheln
  // werden ausgefiltert. Bei einem ganz neuen Konto (noch keine gespeicherte
  // Anordnung) ist DEFAULT_WIDGETS bereits die vollständige Basis — hier
  // dürfen keine "fehlenden" Standard-Kacheln nochmal ergänzt werden.
  const baseLayout = savedLayout ?? DEFAULT_WIDGETS;
  const savedIds = new Set(baseLayout.map((w) => w.id));
  const missingDefaults = savedLayout ? DEFAULT_WIDGETS.filter((w) => !savedIds.has(w.id)) : [];
  const missingCustomKpis = customKpiWidgetIds
    .filter((id) => !savedIds.has(id))
    .map((id) => ({ id, visible: true, size: "sm" as const, order: 0 }));
  const missingCustomCharts = customChartWidgetIds
    .filter((id) => !savedIds.has(id))
    .map((id) => ({ id, visible: true, size: "md" as const, order: 0 }));
  const missing = [...missingDefaults, ...missingCustomKpis, ...missingCustomCharts].map((w, i) => ({
    ...w,
    order: baseLayout.length + i,
  }));

  const layoutWithMissing = [...baseLayout, ...missing].filter((w) => allDefaultIds.includes(w.id));

  // Sicherheitsnetz: falls durch den früheren Fehler bereits doppelte Einträge
  // gespeichert wurden, hier beim Anzeigen bereinigen (erster Treffer gewinnt).
  const layout = Array.from(new Map(layoutWithMissing.map((w) => [w.id, w])).values());

  const firstName = user.name?.split(" ")[0] ?? "";

  const widgetNodes: {
    id: string;
    label?: string;
    node?: React.ReactNode;
    headerAction?: React.ReactNode;
    defaultAccent?: string;
    kpi?: { label: string; value: string; icon?: string; accent: string; href?: string };
  }[] = [
    {
      id: "kpi-offene-aufgaben",
      kpi: {
        label: "Offene Aufgaben",
        value: String(openTasksCount),
        icon: "ListTodo",
        accent: "border-l-brand-500",
        href: "/aufgaben?status=open",
      },
    },
    {
      id: "kpi-offene-rechnungen",
      kpi: {
        label: "Offene Rechnungen",
        value: `${Number(openInvoices._sum.totalGross ?? 0).toLocaleString("de-DE")} €`,
        icon: "FileText",
        accent: "border-l-warning",
        href: "/finanzen?status=open",
      },
    },
    {
      id: "kpi-umsatz-monat",
      kpi: {
        label: "Umsatz diesen Monat",
        value: `${Number(paidThisMonth ?? 0).toLocaleString("de-DE")} €`,
        icon: "Wallet",
        accent: "border-l-success",
        href: "/einblicke",
      },
    },
    {
      id: "kpi-neue-anfragen",
      kpi: {
        label: "Neue Anfragen (Monat)",
        value: String(newInquiriesThisMonth),
        icon: "TrendingUp",
        accent: "border-l-turquoise-500",
        href: "/anfragen?range=month",
      },
    },
    {
      id: "kpi-gewonnen-summe",
      kpi: {
        label: `Gewonnen (${wonAgg._count})`,
        value: `${Number(wonAgg._sum.amount ?? 0).toLocaleString("de-DE")} €`,
        icon: "Trophy",
        accent: "border-l-success",
        href: "/anfragen/gewonnen",
      },
    },
    {
      id: "kpi-verloren-summe",
      kpi: {
        label: `Verloren (${lostAgg._count})`,
        value: `${Number(lostAgg._sum.amount ?? 0).toLocaleString("de-DE")} €`,
        icon: "XCircle",
        accent: "border-l-danger",
        href: "/anfragen/verloren",
      },
    },
    {
      id: "kpi-termine-heute",
      kpi: {
        label: "Heutige Termine",
        value: String(todayAppointmentsCount),
        icon: "CalendarClock",
        accent: "border-l-turquoise-500",
        href: "/termine?day=today",
      },
    },
    {
      id: "kpi-termine-ausgemacht",
      kpi: {
        label: "Ausgemachte Termine",
        value: String(scheduledAppointmentsAgg._count),
        icon: "CalendarCheck",
        accent: "border-l-brand-500",
        href: "/termine?status=SCHEDULED",
      },
    },
    {
      id: "kpi-termine-betrag",
      kpi: {
        label: "Termine Betrag",
        value: `${Number(scheduledAppointmentsAgg._sum.amount ?? 0).toLocaleString("de-DE")} €`,
        icon: "Wallet",
        accent: "border-l-success",
        href: "/termine?status=SCHEDULED",
      },
    },
    {
      id: "kpi-angebote-offen",
      kpi: {
        label: "Offene Angebote",
        value: String(openQuotesCount),
        icon: "FileText",
        accent: "border-l-warning",
        href: "/angebote?status=open",
      },
    },
    {
      id: "kpi-angebote-versendet-betrag",
      kpi: {
        label: "Versendete Angebote (Betrag)",
        value: `${Number(sentQuotesAgg._sum.totalGross ?? 0).toLocaleString("de-DE")} €`,
        icon: "Wallet",
        accent: "border-l-turquoise-500",
        href: "/angebote?status=SENT",
      },
    },
    {
      id: "widget-offene-aufgaben-liste",
      label: "Offene Aufgaben",
      defaultAccent: "border-l-brand-500",
      headerAction: (
        <Link href="/aufgaben?status=open" className="text-xs text-brand-700 hover:underline">
          Alle ansehen
        </Link>
      ),
      node: (
        <>
          {openTasks.length === 0 ? (
            <p className="text-sm text-ink-500">Keine offenen Aufgaben. 🎉</p>
          ) : (
            <ul className="space-y-2">
              {openTasks.map((task) => (
                <li key={task.id} className="text-sm border-l-2 border-ink-100 pl-3">
                  <Link href={`/aufgaben/${task.id}`} className="text-ink-900 hover:underline">
                    {task.title}
                  </Link>
                  {(task.project || task.customer || task.appointment || task.inquiry || task.quote || task.invoice) && (
                    <p className="text-xs text-ink-500 space-x-2">
                      {task.customer && (
                        <Link href={`/kunden/${task.customer.id}`} className="hover:underline">
                          {task.customer.name}
                        </Link>
                      )}
                      {task.project && (
                        <Link href={`/arbeit/${task.project.id}`} className="hover:underline">
                          {task.project.title}
                        </Link>
                      )}
                      {task.appointment && (
                        <Link href={`/termine/${task.appointment.id}`} className="hover:underline">
                          {task.appointment.title}
                        </Link>
                      )}
                      {task.inquiry && (
                        <Link href={`/anfragen/${task.inquiry.id}`} className="hover:underline">
                          {task.inquiry.title}
                        </Link>
                      )}
                      {task.quote && (
                        <Link href={`/angebote/${task.quote.id}`} className="hover:underline">
                          {task.quote.number}
                        </Link>
                      )}
                      {task.invoice && (
                        <Link href={`/finanzen/${task.invoice.id}`} className="hover:underline">
                          {task.invoice.number}
                        </Link>
                      )}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      ),
    },
    {
      id: "widget-naechste-termine",
      defaultAccent: "border-l-turquoise-500",
      headerAction: (
        <Link href="/termine" className="text-xs text-brand-700 hover:underline">
          Alle ansehen
        </Link>
      ),
      node: (
        <>
          {upcomingAppointments.length === 0 ? (
            <Link href="/termine" className="text-sm text-brand-700 hover:underline">
              Keine anstehenden Termine — jetzt einen anlegen
            </Link>
          ) : (
            <ul className="space-y-2">
              {upcomingAppointments.map((a) => (
                <li key={a.id} className="text-sm border-l-2 border-turquoise-500 pl-3">
                  <Link href={`/termine/${a.id}`} className="block hover:underline">
                    <p className="text-ink-900">{a.title}</p>
                    <p className="text-xs text-ink-500">
                      {a.scheduledAt && format(a.scheduledAt, "dd.MM. HH:mm")} Uhr
                      {a.customer && ` · ${a.customer.name}`}
                      {a.amount != null && ` · ${Number(a.amount).toLocaleString("de-DE")} €`}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      ),
    },
    {
      id: "widget-letzte-aktivitaeten",
      defaultAccent: "border-l-success",
      node: <ActivityFeed initialItems={recentActivities.items} initialHasMore={recentActivities.hasMore} />,
    },
    ...customKpis.map((kpi) => ({
      id: `custom:${kpi.id}`,
      kpi: {
        label: kpi.label,
        value: kpi.aggregation === "sum" ? `${kpi.value.toLocaleString("de-DE")} €` : String(kpi.value),
        accent: kpi.accent,
        href: entityStatusHref(kpi.entity as EntityKey, kpi.statusValue),
      },
    })),
    ...customCharts.map((chart) => ({
      id: `chart:${chart.id}`,
      label: chart.label,
      defaultAccent: "border-l-brand-500",
      node: (
        <CustomChart
          chartType={chart.chartType as "bar" | "line" | "pie" | "area"}
          data={chart.data}
          valueSuffix={chart.aggregation === "sum" ? " €" : undefined}
          entity={chart.entity as EntityKey}
        />
      ),
    })),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Heute</h1>
        <p className="text-sm text-ink-500 mt-1">
          Guten Morgen{firstName ? `, ${firstName}` : ""}. Hier ist dein Überblick.
        </p>
      </div>

      {customerCount === 0 && <OnboardingWelcome />}

      <DashboardSwitcher dashboards={dashboards} activeId={activeDashboardId} />

      <DashboardGrid
        key={`${activeDashboardId ?? "default"}:${layout.map((w) => w.id).sort().join(",")}`}
        initialLayout={layout}
        widgetNodes={widgetNodes}
        dashboardId={activeDashboardId}
      />
    </div>
  );
}
