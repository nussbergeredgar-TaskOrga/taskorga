import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { statusColor } from "@/lib/utils";
import { KpiCard } from "@/components/kpi-card";
import { ExpenseForm } from "@/components/expense-form";
import { ExpensesList } from "@/components/expenses-list";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Entwurf",
  SENT: "Versendet",
  OPEN: "Offen",
  PARTIALLY_PAID: "Teilbezahlt",
  PAID: "Bezahlt",
  OVERDUE: "Überfällig",
  CANCELLED: "Storniert",
};

export default async function FinanzenPage() {
  const company = await getCurrentCompany();

  const [invoices, expenses] = await Promise.all([
    prisma.invoice.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
      include: { customer: { select: { name: true } } },
    }),
    prisma.expense.findMany({
      where: { companyId: company.id },
      orderBy: { date: "desc" },
      include: { documents: { select: { id: true, fileName: true, fileUrl: true } } },
    }),
  ]);

  const paidTotal = invoices
    .filter((i) => i.status === "PAID")
    .reduce((sum, i) => sum + Number(i.totalGross), 0);
  const openTotal = invoices
    .filter((i) => ["SENT", "OPEN", "PARTIALLY_PAID", "OVERDUE"].includes(i.status))
    .reduce((sum, i) => sum + Number(i.totalGross), 0);

  const openExpenses = expenses.filter((e) => e.status === "OPEN");
  const paidExpenses = expenses.filter((e) => e.status === "PAID");
  const openExpensesTotal = openExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const paidExpensesTotal = paidExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const mappedExpenses = (list: typeof expenses) =>
    list.map((e) => ({
      id: e.id,
      title: e.title,
      category: e.category,
      amount: Number(e.amount),
      date: e.date,
      status: e.status,
      documents: e.documents,
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Finanzen</h1>
        <p className="text-sm text-ink-500 mt-1">{invoices.length} Rechnungen insgesamt</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <KpiCard label="Bezahlt" value={`${paidTotal.toLocaleString("de-DE")} €`} accent="border-l-success" />
        <KpiCard label="Offen" value={`${openTotal.toLocaleString("de-DE")} €`} accent="border-l-warning" />
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-card border border-dashed border-ink-100 bg-white p-12 text-center">
          <p className="text-ink-500 text-sm">
            Noch keine Rechnungen. Erstelle eine Rechnung aus einem Auftrag im „Arbeit"-Workspace.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <Link
              key={inv.id}
              href={`/finanzen/${inv.id}`}
              className={`flex items-center justify-between rounded-lg border-l-4 bg-white p-4 shadow-card hover:shadow-cardHover transition-shadow ${statusColor[inv.status]}`}
            >
              <div>
                <p className="font-medium text-ink-900">{inv.number}</p>
                <p className="text-sm text-ink-500">{inv.customer.name}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-medium text-ink-900">
                  {Number(inv.totalGross).toLocaleString("de-DE")} €
                </p>
                <p className="text-xs text-ink-500">{STATUS_LABELS[inv.status]}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Meine Ausgaben */}
      <div className="rounded-card border border-ink-100 bg-white p-6 shadow-card space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-ink-900 text-lg">Meine Ausgaben</h2>
          <ExpenseForm />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <KpiCard label="Offen" value={`${openExpensesTotal.toLocaleString("de-DE")} €`} accent="border-l-warning" />
          <KpiCard label="Bezahlt" value={`${paidExpensesTotal.toLocaleString("de-DE")} €`} accent="border-l-success" />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <ExpensesList title="Offene Ausgaben" expenses={mappedExpenses(openExpenses)} />
          <ExpensesList title="Bezahlte Ausgaben" expenses={mappedExpenses(paidExpenses)} />
        </div>
      </div>
    </div>
  );
}
