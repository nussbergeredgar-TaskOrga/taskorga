import Link from "next/link";
import { AlertTriangle, Plus, Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { KpiCard } from "@/components/kpi-card";
import { ExpenseForm } from "@/components/expense-form";
import { ExpensesList } from "@/components/expenses-list";
import { InvoicesListView } from "@/components/invoices-list-view";
import { markOverdueInvoices } from "@/lib/actions/invoices";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Entwurf",
  SENT: "Versendet",
  OPEN: "Offen",
  PARTIALLY_PAID: "Teilbezahlt",
  PAID: "Bezahlt",
  OVERDUE: "Überfällig",
  CANCELLED: "Storniert",
};

const OPEN_INVOICE_STATUSES = ["SENT", "OPEN", "PARTIALLY_PAID", "OVERDUE"];

const EXPENSE_STATUS_LABELS: Record<string, string> = {
  OPEN: "Offen",
  PAID: "Bezahlt",
};

export default async function FinanzenPage({
  searchParams,
}: {
  searchParams: { status?: string; expenseStatus?: string };
}) {
  const admin = await requirePermission("finanzen");
  const company = { id: admin.companyId };

  // Fällige, unbezahlte Rechnungen automatisch auf "Überfällig" setzen
  await markOverdueInvoices();

  const [invoices, expenses, projects] = await Promise.all([
    prisma.invoice.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
      include: { customer: { select: { name: true } } },
    }),
    prisma.expense.findMany({
      where: { companyId: company.id },
      orderBy: { date: "desc" },
      include: {
        documents: { select: { id: true, fileName: true, fileUrl: true } },
        project: { select: { id: true, title: true, number: true } },
      },
    }),
    prisma.project.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, number: true },
    }),
  ]);

  const paidTotal = invoices.reduce((sum, i) => sum + Number(i.paidAmount), 0);
  const openTotal = invoices
    .filter((i) => ["SENT", "OPEN", "PARTIALLY_PAID", "OVERDUE"].includes(i.status))
    .reduce((sum, i) => sum + Number(i.totalGross) - Number(i.paidAmount), 0);
  const overdueInvoices = invoices.filter((i) => i.status === "OVERDUE");
  const overdueTotal = overdueInvoices.reduce((sum, i) => sum + Number(i.totalGross) - Number(i.paidAmount), 0);

  const statusFilter = searchParams.status;
  const displayedInvoices = statusFilter
    ? invoices.filter((i) =>
        statusFilter === "open" ? OPEN_INVOICE_STATUSES.includes(i.status) : i.status === statusFilter
      )
    : invoices;
  const statusFilterLabel = statusFilter === "open" ? "Offen" : statusFilter ? STATUS_LABELS[statusFilter] : null;

  const openExpenses = expenses.filter((e) => e.status === "OPEN");
  const paidExpenses = expenses.filter((e) => e.status === "PAID");
  const openExpensesTotal = openExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const paidExpensesTotal = paidExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const expenseStatusFilter = searchParams.expenseStatus;
  const expenseStatusFilterLabel = expenseStatusFilter ? EXPENSE_STATUS_LABELS[expenseStatusFilter] : null;

  const mappedExpenses = (list: typeof expenses) =>
    list.map((e) => ({
      id: e.id,
      title: e.title,
      category: e.category,
      amount: Number(e.amount),
      date: e.date,
      status: e.status,
      documents: e.documents,
      project: e.project,
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Finanzen</h1>
          <p className="text-sm text-ink-500 mt-1">{invoices.length} Rechnungen insgesamt</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/finanzen/export?type=invoices"
            className="flex items-center gap-1.5 rounded-lg border border-ink-100 text-ink-700 text-sm font-medium px-3 py-2.5 hover:bg-ink-50 transition-colors"
          >
            <Download size={15} />
            Rechnungen als CSV
          </a>
          <Link
            href="/finanzen/neu"
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2.5 hover:bg-brand-600 transition-colors"
          >
            <Plus size={16} />
            Neue Rechnung
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Bezahlt" value={`${paidTotal.toLocaleString("de-DE")} €`} accent="border-l-success" />
        <KpiCard label="Offen" value={`${openTotal.toLocaleString("de-DE")} €`} accent="border-l-warning" />
        <KpiCard label="Überfällig" value={`${overdueTotal.toLocaleString("de-DE")} €`} accent="border-l-danger" />
      </div>

      {overdueInvoices.length > 0 && (
        <div className="rounded-card border border-danger/30 bg-danger/5 p-5 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-danger" />
            <h2 className="font-display font-semibold text-ink-900">
              Mahnwesen — {overdueInvoices.length} überfällige Rechnung{overdueInvoices.length !== 1 ? "en" : ""}
            </h2>
          </div>
          <div className="space-y-2">
            {overdueInvoices.map((inv) => (
              <Link
                key={inv.id}
                href={`/finanzen/${inv.id}`}
                className="flex items-center justify-between rounded-lg bg-surface px-3 py-2.5 text-sm hover:bg-ink-50 transition-colors"
              >
                <div>
                  <span className="font-medium text-ink-900">{inv.number}</span>
                  <span className="text-ink-500 ml-2">{inv.customer.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-ink-900">{Number(inv.totalGross).toLocaleString("de-DE")} €</span>
                  {inv.reminderLevel > 0 && (
                    <span className="text-xs text-warning">
                      Stufe {inv.reminderLevel}
                      {inv.lastReminderSentAt &&
                        ` · zuletzt ${inv.lastReminderSentAt.toLocaleDateString("de-DE")}`}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {statusFilterLabel && (
        <div className="flex items-center gap-2 text-sm text-ink-500">
          Gefiltert: <span className="font-medium text-ink-900">{statusFilterLabel}</span>
          <Link href="/finanzen" className="text-brand-700 hover:underline">
            Zurücksetzen
          </Link>
        </div>
      )}

      {invoices.length === 0 ? (
        <div className="rounded-card border border-dashed border-ink-100 bg-surface p-12 text-center">
          <p className="text-ink-500 text-sm">
            Noch keine Rechnungen. Direkt{" "}
            <Link href="/finanzen/neu" className="text-brand-700 hover:underline">
              eine neue Rechnung erstellen
            </Link>{" "}
            oder aus einem Auftrag im{" "}
            <Link href="/arbeit" className="text-brand-700 hover:underline">
              „Arbeit"-Workspace
            </Link>
            .
          </p>
        </div>
      ) : displayedInvoices.length === 0 ? (
        <div className="rounded-card border border-dashed border-ink-100 bg-surface p-8 text-center">
          <p className="text-ink-500 text-sm">Keine Rechnungen mit diesem Filter.</p>
        </div>
      ) : (
        <InvoicesListView
          invoices={displayedInvoices.map((inv) => ({
            id: inv.id,
            number: inv.number,
            customerName: inv.customer.name,
            totalGross: Number(inv.totalGross),
            status: inv.status,
            dueDate: inv.dueDate ? inv.dueDate.toISOString() : null,
            createdAt: inv.createdAt.toISOString(),
          }))}
        />
      )}

      {/* Meine Ausgaben */}
      <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-ink-900 text-lg">Meine Ausgaben</h2>
          <div className="flex items-center gap-2">
            <a
              href="/api/finanzen/export?type=expenses"
              className="flex items-center gap-1.5 rounded-lg border border-ink-100 text-ink-700 text-sm font-medium px-3 py-2 hover:bg-ink-50 transition-colors"
            >
              <Download size={14} />
              CSV
            </a>
            <ExpenseForm projects={projects} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <KpiCard label="Offen" value={`${openExpensesTotal.toLocaleString("de-DE")} €`} accent="border-l-warning" />
          <KpiCard label="Bezahlt" value={`${paidExpensesTotal.toLocaleString("de-DE")} €`} accent="border-l-success" />
        </div>

        {expenseStatusFilterLabel && (
          <div className="flex items-center gap-2 text-sm text-ink-500">
            Gefiltert: <span className="font-medium text-ink-900">{expenseStatusFilterLabel}</span>
            <Link href="/finanzen" className="text-brand-700 hover:underline">
              Zurücksetzen
            </Link>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {(!expenseStatusFilter || expenseStatusFilter === "OPEN") && (
            <ExpensesList title="Offene Ausgaben" expenses={mappedExpenses(openExpenses)} />
          )}
          {(!expenseStatusFilter || expenseStatusFilter === "PAID") && (
            <ExpensesList title="Bezahlte Ausgaben" expenses={mappedExpenses(paidExpenses)} />
          )}
        </div>
      </div>
    </div>
  );
}
