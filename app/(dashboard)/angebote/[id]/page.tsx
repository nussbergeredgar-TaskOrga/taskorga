import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileDown, Eye } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { QuoteActions } from "@/components/quote-actions";
import { QuoteVersionHistory } from "@/components/quote-version-history";
import { RecordNotes } from "@/components/record-notes";
import { RecordTasks } from "@/components/record-tasks";
import { DocumentTab } from "@/components/document-tab";
import { getCurrentCompany } from "@/lib/session";

export default async function AngebotDetailPage({ params }: { params: { id: string } }) {
  const company = await getCurrentCompany();
  const [quote, versions] = await Promise.all([
    prisma.quote.findFirst({
      where: { id: params.id, companyId: company.id },
      include: {
        customer: true,
        items: { orderBy: { position: "asc" } },
        project: true,
        comments: { orderBy: { createdAt: "desc" }, include: { user: true } },
        tasks: { orderBy: { createdAt: "desc" } },
        documents: { orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.quoteVersion.findMany({
      where: { quoteId: params.id },
      orderBy: { versionNumber: "desc" },
    }),
  ]);
  if (!quote) notFound();

  const link = { quoteId: quote.id };

  const netBeforeDiscount = quote.items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0);
  const discountAmount = netBeforeDiscount - Number(quote.totalNet) * (netBeforeDiscount / Math.max(Number(quote.totalNet), 1));

  return (
    <div className="space-y-6">
      <Link href="/angebote" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors">
        <ArrowLeft size={16} /> Zurück zu Angeboten
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">{quote.title}</h1>
          <p className="text-sm text-ink-500 mt-1">
            {quote.number} · {quote.customer.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/angebote/${quote.id}/vorschau`}
            className="flex items-center gap-1.5 rounded-lg border border-ink-100 text-ink-700 text-sm font-medium px-3 py-2 hover:bg-ink-50 transition-colors"
          >
            <Eye size={15} />
            Vorschau
          </Link>
          <a
            href={`/api/angebote/${quote.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-ink-100 text-ink-700 text-sm font-medium px-3 py-2 hover:bg-ink-50 transition-colors"
          >
            <FileDown size={15} />
            PDF
          </a>
          <QuoteActions quoteId={quote.id} status={quote.status} hasCustomerEmail={!!quote.customer.email} />
        </div>
      </div>

      <div className="rounded-card border border-ink-100 bg-surface overflow-hidden shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-ink-50 text-ink-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2.5">Beschreibung</th>
              <th className="text-right px-4 py-2.5">Menge</th>
              <th className="text-right px-4 py-2.5">Einzelpreis</th>
              <th className="text-right px-4 py-2.5">MwSt.</th>
              <th className="text-right px-4 py-2.5">Summe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {quote.items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-2.5 text-ink-900">{item.description}</td>
                <td className="px-4 py-2.5 text-right font-mono text-ink-500">
                  {Number(item.quantity)} {item.unit}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-ink-500">
                  {Number(item.unitPrice).toLocaleString("de-DE")} €
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-ink-500">
                  {Number(item.taxRate)}%
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-ink-900">
                  {(Number(item.quantity) * Number(item.unitPrice)).toLocaleString("de-DE")} €
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-ink-100 px-4 py-3 bg-ink-50 space-y-1">
          {quote.discountValue != null && (
            <div className="flex justify-end gap-6 text-sm font-mono text-ink-500">
              <span>
                Rabatt {quote.discountType === "PERCENT" ? `(${Number(quote.discountValue)}%)` : ""}
              </span>
            </div>
          )}
          <div className="flex justify-end gap-6 text-sm font-mono">
            <span className="text-ink-500">Netto: {Number(quote.totalNet).toLocaleString("de-DE")} €</span>
            <span className="font-medium text-ink-900">
              Brutto: {Number(quote.totalGross).toLocaleString("de-DE")} €
            </span>
          </div>
        </div>
      </div>

      {quote.project && (
        <Link
          href={`/arbeit/${quote.project.id}`}
          className="inline-block text-sm text-brand-700 hover:underline"
        >
          → Zugehörigen Auftrag {quote.project.number} ansehen
        </Link>
      )}

      <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card">
        <h2 className="font-display font-semibold text-ink-900 mb-3">Notizen</h2>
        <RecordNotes
          link={link}
          notes={quote.comments.map((c) => ({ id: c.id, content: c.content, createdAt: c.createdAt, user: c.user }))}
        />
      </div>

      <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card">
        <h2 className="font-display font-semibold text-ink-900 mb-3">Verknüpfte Aufgaben</h2>
        <RecordTasks
          link={link}
          tasks={quote.tasks.map((t) => ({ id: t.id, title: t.title, status: t.status, dueDate: t.dueDate }))}
        />
      </div>

      <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card">
        <h2 className="font-display font-semibold text-ink-900 mb-3">Dokumente</h2>
        <DocumentTab link={link} documents={quote.documents} />
      </div>

      <QuoteVersionHistory
        quoteId={quote.id}
        versions={versions.map((v) => ({
          id: v.id,
          versionNumber: v.versionNumber,
          createdAt: v.createdAt,
          snapshot: v.snapshot as any,
        }))}
      />
    </div>
  );
}
