import Link from "next/link";
import { ListTodo, Wallet, FileText, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany, getCurrentUser } from "@/lib/session";
import { KpiCard } from "@/components/kpi-card";
import { formatDistanceToNow } from "date-fns";
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
  ]);

  const kpis = [
    {
      label: "Offene Aufgaben",
      value: String(openTasksCount),
      icon: ListTodo,
      accent: "border-l-brand-500",
    },
    {
      label: "Offene Rechnungen",
      value: `${Number(openInvoices._sum.totalGross ?? 0).toLocaleString("de-DE")} €`,
      icon: FileText,
      accent: "border-l-warning",
    },
    {
      label: "Umsatz diesen Monat",
      value: `${Number(paidThisMonth._sum.totalGross ?? 0).toLocaleString("de-DE")} €`,
      icon: Wallet,
      accent: "border-l-success",
    },
    {
      label: "Neue Anfragen (Monat)",
      value: String(newInquiriesThisMonth),
      icon: TrendingUp,
      accent: "border-l-turquoise-500",
    },
  ];

  const firstName = user.name?.split(" ")[0] ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Heute</h1>
        <p className="text-sm text-ink-500 mt-1">
          Guten Morgen{firstName ? `, ${firstName}` : ""}. Hier ist dein Überblick.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-card border border-ink-100 bg-white p-5 shadow-card">
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

        <div className="rounded-card border border-ink-100 bg-white p-5 shadow-card">
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
      </div>
    </div>
  );
}
