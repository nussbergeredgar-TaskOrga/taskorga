import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getCurrentCompany } from "@/lib/session";
import { ProjectActions } from "@/components/project-actions";
import { RecordTasks } from "@/components/record-tasks";
import { TimeTracking } from "@/components/time-tracking";
import { ExpenseForm } from "@/components/expense-form";
import { ExpensesList } from "@/components/expenses-list";
import { DocumentTab } from "@/components/document-tab";

export default async function AuftragDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  const company = await getCurrentCompany();
  const project = await prisma.project.findFirst({
    where: { id: params.id, companyId: company.id },
    include: {
      customer: true,
      tasks: { orderBy: { createdAt: "asc" } },
      invoices: { orderBy: { createdAt: "desc" } },
      quote: true,
      timeEntries: { orderBy: { date: "desc" }, include: { user: { select: { name: true } } } },
      expenses: {
        orderBy: { date: "desc" },
        include: { documents: { select: { id: true, fileName: true, fileUrl: true } } },
      },
      documents: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!project) notFound();

  const mappedExpenses = project.expenses.map((e) => ({
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
      <Link href="/arbeit" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors">
        <ArrowLeft size={16} /> Zurück zu Arbeit
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">{project.title}</h1>
          <p className="text-sm text-ink-500 mt-1">
            {project.number} ·{" "}
            <Link href={`/kunden/${project.customer.id}`} className="hover:underline">
              {project.customer.name}
            </Link>
            {project.quote && (
              <>
                {" · "}
                <Link href={`/angebote/${project.quote.id}`} className="hover:underline">
                  Angebot {project.quote.number}
                </Link>
              </>
            )}
          </p>
        </div>
        <ProjectActions projectId={project.id} status={project.status} cancelReason={project.cancelReason} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-card border border-ink-100 bg-surface p-5 shadow-card">
          <h2 className="font-display font-semibold text-ink-900 mb-3">Aufgaben</h2>
          <RecordTasks
            link={{ projectId: project.id }}
            tasks={project.tasks.map((t) => ({ id: t.id, title: t.title, status: t.status, dueDate: t.dueDate }))}
          />
        </div>

        <div className="rounded-card border border-ink-100 bg-surface p-5 shadow-card">
          <h2 className="font-display font-semibold text-ink-900 mb-3">Rechnungen</h2>
          {project.invoices.length === 0 ? (
            <p className="text-sm text-ink-500">Noch keine Rechnung erstellt.</p>
          ) : (
            <ul className="space-y-2">
              {project.invoices.map((inv) => (
                <li key={inv.id}>
                  <Link
                    href={`/finanzen/${inv.id}`}
                    className="flex justify-between text-sm rounded-lg bg-ink-50 px-3 py-2 hover:bg-ink-100 transition-colors"
                  >
                    <span>{inv.number}</span>
                    <span className="font-mono">{Number(inv.totalGross).toLocaleString("de-DE")} €</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-card border border-ink-100 bg-surface p-5 shadow-card">
        <TimeTracking projectId={project.id} entries={project.timeEntries} currentUserId={user.id} />
      </div>

      <div className="rounded-card border border-ink-100 bg-surface p-5 shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-ink-900">Ausgaben</h2>
          <ExpenseForm defaultProjectId={project.id} />
        </div>
        <ExpensesList title="Materialkosten & Ausgaben" expenses={mappedExpenses} />
      </div>

      <div className="rounded-card border border-ink-100 bg-surface p-5 shadow-card">
        <h2 className="font-display font-semibold text-ink-900 mb-3">Dokumente</h2>
        <DocumentTab link={{ projectId: project.id }} documents={project.documents} />
      </div>
    </div>
  );
}
