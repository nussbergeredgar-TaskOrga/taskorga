import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileDown, Eye } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { InvoiceActions } from "@/components/invoice-actions";
import { RecordNotes } from "@/components/record-notes";
import { RecordTasks } from "@/components/record-tasks";

export default async function RechnungDetailPage({ params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, companyId: admin.companyId },
    include: {
      customer: true,
      items: { orderBy: { position: "asc" } },
      project: true,
      comments: { orderBy: { createdAt: "desc" }, include: { user: true } },
      tasks: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!invoice) notFound();

  const link = { invoiceId: invoice.id };

  return (
    <div className="space-y-6">
      <Link href="/finanzen" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors">
        <ArrowLeft size={16} /> Zurück zu Finanzen
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900 flex items-center gap-2">
            Rechnung {invoice.number}
            {invoice.status === "OVERDUE" && (
              <span className="text-xs font-medium bg-danger/10 text-danger px-2 py-1 rounded-full">
                Überfällig
              </span>
            )}
          </h1>
          <p className="text-sm text-ink-500 mt-1">
            <Link href={`/kunden/${invoice.customer.id}`} className="hover:underline">
              {invoice.customer.name}
            </Link>
            {invoice.project && (
              <>
                {" · "}
                <Link href={`/arbeit/${invoice.project.id}`} className="hover:underline">
                  Auftrag {invoice.project.number}
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/finanzen/${invoice.id}/vorschau`}
            className="flex items-center gap-1.5 rounded-lg border border-ink-100 text-ink-700 text-sm font-medium px-3 py-2 hover:bg-ink-50 transition-colors"
          >
            <Eye size={15} />
            Vorschau
          </Link>
          <a
            href={`/api/rechnungen/${invoice.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-ink-100 text-ink-700 text-sm font-medium px-3 py-2 hover:bg-ink-50 transition-colors"
          >
            <FileDown size={15} />
            PDF
          </a>
          <InvoiceActions
            invoiceId={invoice.id}
            status={invoice.status}
            reminderLevel={invoice.reminderLevel}
            lastReminderSentAt={invoice.lastReminderSentAt}
            hasCustomerEmail={!!invoice.customer.email}
            totalGross={Number(invoice.totalGross)}
            paidAmount={Number(invoice.paidAmount)}
          />
        </div>
      </div>

      <div className="rounded-card border border-ink-100 bg-surface overflow-hidden shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-ink-50 text-ink-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2.5">Beschreibung</th>
              <th className="text-right px-4 py-2.5">Menge</th>
              <th className="text-right px-4 py-2.5">Einzelpreis</th>
              <th className="text-right px-4 py-2.5">Summe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {invoice.items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-2.5 text-ink-900">{item.description}</td>
                <td className="px-4 py-2.5 text-right font-mono text-ink-500">
                  {Number(item.quantity)} {item.unit}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-ink-500">
                  {Number(item.unitPrice).toLocaleString("de-DE")} €
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-ink-900">
                  {(Number(item.quantity) * Number(item.unitPrice)).toLocaleString("de-DE")} €
                </td>
              </tr>
            ))}
            {invoice.items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ink-300">
                  Keine Positionen (Auftrag hatte kein verknüpftes Angebot).
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="border-t border-ink-100 px-4 py-3 flex justify-end gap-6 text-sm font-mono bg-ink-50">
          <span className="text-ink-500">Netto: {Number(invoice.totalNet).toLocaleString("de-DE")} €</span>
          <span className="font-medium text-ink-900">
            Brutto: {Number(invoice.totalGross).toLocaleString("de-DE")} €
          </span>
          {Number(invoice.paidAmount) > 0 && (
            <span className="text-success">
              Bezahlt: {Number(invoice.paidAmount).toLocaleString("de-DE")} €
            </span>
          )}
        </div>
      </div>

      <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card">
        <h2 className="font-display font-semibold text-ink-900 mb-3">Notizen</h2>
        <RecordNotes
          link={link}
          notes={invoice.comments.map((c) => ({ id: c.id, content: c.content, createdAt: c.createdAt, user: c.user }))}
        />
      </div>

      <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card">
        <h2 className="font-display font-semibold text-ink-900 mb-3">Verknüpfte Aufgaben</h2>
        <RecordTasks
          link={link}
          tasks={invoice.tasks.map((t) => ({ id: t.id, title: t.title, status: t.status, dueDate: t.dueDate }))}
        />
      </div>
    </div>
  );
}
