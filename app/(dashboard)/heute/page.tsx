import Link from "next/link";
import { ListTodo, Wallet, FileText, TrendingUp, Trophy, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany, getCurrentUser } from "@/lib/session";
import { KpiCard } from "@/components/kpi-card";
import { DashboardGrid } from "@/components/dashboard-grid";
import { getDashboardLayout } from "@/lib/actions/dashboard";
import { DEFAULT_WIDGETS } from "@/lib/dashboard-widgets";
import { formatDistanceToNow, format } from "date-fns";
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
    savedLayout,
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
    getDashboardLayout(),
  ]);

  // Falls neue Standard-Widgets seit der letzten Speicherung dazugekommen
  // sind (z.B. durch ein Update), werden sie am Ende ergänzt statt zu fehlen.
  const savedIds = new Set((savedLayout ?? []).map((w) => w.id));
  const missing = DEFAULT_WIDGETS.filter((w) => !savedIds.has(w.id)).map((w, i) => ({
    ...w,
    order: (savedLayout?.length ?? 0) + i,
  }));
  const layout = savedLayout ? [...savedLayout, ...missing] : DEFAULT_WIDGETS;

  const firstName = user.name?.split(" ")[0] ?? "";

  const widgetNodes = [
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
      id: "widget-offene-aufgaben-liste",
      node: (
        <div id="offene-aufgaben" className="rounded-card border border-ink-100 bg-white p-5 shadow-card scroll-mt-6 h-full">
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
        <div className="rounded-card border border-ink-100 bg-white p-5 shadow-card h-full">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-ink-900">Nächste Termine</h2>
            <Link href="/termine" className="text-xs text-brand-700 hover:underline">
              Alle ansehen
            </Link>
          </div>
          {upcomingAppointments.length === 0 ? (
            <p className="text-sm text-ink-500">Keine anstehenden Termine.</p>
          ) : (
            <ul className="space-y-2">
              {upcomingAppointments.map((a) => (
                <li key={a.id} className="text-sm border-l-2 border-turquoise-500 pl-3">
                  <Link href={a.customer ? `/kunden/${a.customer.id}` : "/termine"} className="block hover:underline">
                    <p className="text-ink-900">{a.title}</p>
                    <p className="text-xs text-ink-500">
                      {a.scheduledAt && format(a.scheduledAt, "dd.MM. HH:mm")} Uhr
                      {a.customer && ` · ${a.customer.name}`}
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
        <div className="rounded-card border border-ink-100 bg-white p-5 shadow-card h-full">
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
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Heute</h1>
        <p className="text-sm text-ink-500 mt-1">
          Guten Morgen{firstName ? `, ${firstName}` : ""}. Hier ist dein Überblick.
        </p>
      </div>

      <DashboardGrid initialLayout={layout} widgetNodes={widgetNodes} />
    </div>
  );
}
