import Link from "next/link";
import { ListTodo, Wallet, FileText, TrendingUp, Trophy, XCircle, CalendarClock, CalendarCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany, getCurrentUser } from "@/lib/session";
import { KpiCard } from "@/components/kpi-card";
import { DashboardGrid } from "@/components/dashboard-grid";
import { getDashboardLayout } from "@/lib/actions/dashboard";
import { getCustomKpiValues } from "@/lib/actions/custom-kpi";
import { DEFAULT_WIDGETS } from "@/lib/dashboard-widgets";
import { formatDistanceToNow, format, isSameDay, startOfDay, endOfDay } from "date-fns";
import { de } from "date-fns/locale";

export default async function HeutePage() {
  const company = await getCurrentCompany();
  const user = await getCurrentUser();

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
    savedLayout,
    customKpis,
  ] = await Promise.all([
    prisma.task.count({
      where: { companyId: company.id, status: { in: ["OPEN", "IN_PROGRESS"] } },
    }),
    prisma.invoice.aggregate({
      where: { companyId: company.id, status: { in: ["SENT", "OPEN", "PARTIALLY_PAID", "OVERDUE"] } },
      _sum: { totalGross: true },
    }),
    prisma.invoice.aggregate({
      where: { companyId: company.id, status: "PAID", paidAt: { gte: startOfMonth } },
      _sum: { totalGross: true },
    }),
    prisma.inquiry.count({
      where: { companyId: company.id, createdAt: { gte: startOfMonth } },
    }),
    prisma.task.findMany({
      where: { companyId: company.id, status: { in: ["OPEN", "IN_PROGRESS"] } },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { project: { select: { title: true, id: true } }, customer: { select: { name: true, id: true } } },
    }),
    prisma.activity.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
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
    getDashboardLayout(),
    getCustomKpiValues(),
  ]);

  const customWidgetIds = customKpis.map((k) => `custom:${k.id}`);
  const allDefaultIds = [...DEFAULT_WIDGETS.map((w) => w.id), ...customWidgetIds];

  // Neue Standard-Kacheln und neu erstellte eigene Kacheln ergänzen, falls sie
  // in der gespeicherten Konfiguration noch fehlen. Gelöschte eigene Kacheln
  // werden ausgefiltert. Bei einem ganz neuen Konto (noch keine gespeicherte
  // Anordnung) ist DEFAULT_WIDGETS bereits die vollständige Basis — hier
  // dürfen keine "fehlenden" Standard-Kacheln nochmal ergänzt werden.
  const baseLayout = savedLayout ?? DEFAULT_WIDGETS;
  const savedIds = new Set(baseLayout.map((w) => w.id));
  const missingDefaults = savedLayout ? DEFAULT_WIDGETS.filter((w) => !savedIds.has(w.id)) : [];
  const missingCustom = customWidgetIds
    .filter((id) => !savedIds.has(id))
    .map((id) => ({ id, visible: true, size: "sm" as const, order: 0 }));
  const missing = [...missingDefaults, ...missingCustom].map((w, i) => ({
    ...w,
    order: baseLayout.length + i,
  }));

  const layout = [...baseLayout, ...missing].filter((w) => allDefaultIds.includes(w.id));

  const firstName = user.name?.split(" ")[0] ?? "";

  const widgetNodes: { id: string; label?: string; node: React.ReactNode }[] = [
    {
      id: "kpi-offene-aufgaben",
      node: (
        <KpiCard
          label="Offene Aufgaben"
          value={String(openTasksCount)}
          icon={ListTodo}
          accent="border-l-brand-500"
          href="#offene-aufgaben"
        />
      ),
    },
    {
      id: "kpi-offene-rechnungen",
      node: (
        <KpiCard
          label="Offene Rechnungen"
          value={`${Number(openInvoices._sum.totalGross ?? 0).toLocaleString("de-DE")} €`}
          icon={FileText}
          accent="border-l-warning"
          href="/finanzen"
        />
      ),
    },
    {
      id: "kpi-umsatz-monat",
      node: (
        <KpiCard
          label="Umsatz diesen Monat"
          value={`${Number(paidThisMonth._sum.totalGross ?? 0).toLocaleString("de-DE")} €`}
          icon={Wallet}
          accent="border-l-success"
          href="/finanzen"
        />
      ),
    },
    {
      id: "kpi-neue-anfragen",
      node: (
        <KpiCard
          label="Neue Anfragen (Monat)"
          value={String(newInquiriesThisMonth)}
          icon={TrendingUp}
          accent="border-l-turquoise-500"
          href="/anfragen"
        />
      ),
    },
    {
      id: "kpi-gewonnen-summe",
      node: (
        <KpiCard
          label={`Gewonnen (${wonAgg._count})`}
          value={`${Number(wonAgg._sum.amount ?? 0).toLocaleString("de-DE")} €`}
          icon={Trophy}
          accent="border-l-success"
          href="/anfragen/gewonnen"
        />
      ),
    },
    {
      id: "kpi-verloren-summe",
      node: (
        <KpiCard
          label={`Verloren (${lostAgg._count})`}
          value={`${Number(lostAgg._sum.amount ?? 0).toLocaleString("de-DE")} €`}
          icon={XCircle}
          accent="border-l-danger"
          href="/anfragen/verloren"
        />
      ),
    },
    {
      id: "kpi-termine-heute",
      node: (
        <KpiCard
          label="Heutige Termine"
          value={String(todayAppointmentsCount)}
          icon={CalendarClock}
          accent="border-l-turquoise-500"
          href="/termine"
        />
      ),
    },
    {
      id: "kpi-termine-ausgemacht",
      node: (
        <KpiCard
          label="Ausgemachte Termine"
          value={String(scheduledAppointmentsAgg._count)}
          icon={CalendarCheck}
          accent="border-l-brand-500"
          href="/termine"
        />
      ),
    },
    {
      id: "kpi-termine-betrag",
      node: (
        <KpiCard
          label="Termine Betrag"
          value={`${Number(scheduledAppointmentsAgg._sum.amount ?? 0).toLocaleString("de-DE")} €`}
          icon={Wallet}
          accent="border-l-success"
          href="/termine"
        />
      ),
    },
    {
      id: "widget-offene-aufgaben-liste",
      node: (
        <div id="offene-aufgaben" className="rounded-card border border-ink-100 bg-surface p-5 shadow-card scroll-mt-6 h-full">
          <h2 className="font-display font-semibold text-ink-900 mb-3">Offene Aufgaben</h2>
          {openTasks.length === 0 ? (
            <p className="text-sm text-ink-500">Keine offenen Aufgaben. 🎉</p>
          ) : (
            <ul className="space-y-2">
              {openTasks.map((task) => (
                <li key={task.id} className="text-sm border-l-2 border-ink-100 pl-3">
                  <p className="text-ink-900">{task.title}</p>
                  {(task.project || task.customer) && (
                    <p className="text-xs text-ink-500">
                      {task.project ? (
                        <Link href={`/arbeit/${task.project.id}`} className="hover:underline">
                          {task.project.title}
                        </Link>
                      ) : task.customer ? (
                        <Link href={`/kunden/${task.customer.id}`} className="hover:underline">
                          {task.customer.name}
                        </Link>
                      ) : null}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ),
    },
    {
      id: "widget-naechste-termine",
      node: (
        <div className="rounded-card border border-ink-100 bg-surface p-5 shadow-card h-full">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-ink-900">Nächste Termine</h2>
            <Link href="/termine" className="text-xs text-brand-700 hover:underline">
              Alle ansehen
            </Link>
          </div>
          {upcomingAppointments.length === 0 ? (
            <Link href="/termine" className="text-sm text-brand-700 hover:underline">
              Keine anstehenden Termine — jetzt einen anlegen
            </Link>
          ) : (
            <ul className="space-y-2">
              {upcomingAppointments.map((a) => (
                <li key={a.id} className="text-sm border-l-2 border-turquoise-500 pl-3">
                  <Link href={a.customer ? `/kunden/${a.customer.id}` : "/termine"} className="block hover:underline">
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
        </div>
      ),
    },
    {
      id: "widget-letzte-aktivitaeten",
      node: (
        <div className="rounded-card border border-ink-100 bg-surface p-5 shadow-card h-full">
          <h2 className="font-display font-semibold text-ink-900 mb-3">Letzte Aktivitäten</h2>
          {recentActivities.length === 0 ? (
            <p className="text-sm text-ink-500">Noch keine Aktivitäten.</p>
          ) : (
            <ul className="space-y-2">
              {recentActivities.map((a) => (
                <li key={a.id} className="text-sm border-l-2 border-ink-100 pl-3">
                  <p className="text-ink-900">{a.message}</p>
                  <p className="text-xs text-ink-300">
                    {formatDistanceToNow(a.createdAt, { addSuffix: true, locale: de })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ),
    },
    ...customKpis.map((kpi) => ({
      id: `custom:${kpi.id}`,
      label: kpi.label,
      node: (
        <KpiCard
          label={kpi.label}
          value={
            kpi.aggregation === "sum"
              ? `${kpi.value.toLocaleString("de-DE")} €`
              : String(kpi.value)
          }
          accent={kpi.accent}
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

      <DashboardGrid
        key={layout.map((w) => w.id).sort().join(",")}
        initialLayout={layout}
        widgetNodes={widgetNodes}
      />
    </div>
  );
}
