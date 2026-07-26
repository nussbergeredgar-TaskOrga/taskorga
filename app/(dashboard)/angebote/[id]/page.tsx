import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { QuoteActions } from "@/components/quote-actions";

export default async function AngebotDetailPage({ params }: { params: { id: string } }) {
  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
    include: { customer: true, items: { orderBy: { position: "asc" } }, project: true },
  });
  if (!quote) notFound();

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
        <QuoteActions quoteId={quote.id} status={quote.status} />
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
            {quote.items.map((item) => (
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
          </tbody>
        </table>
        <div className="border-t border-ink-100 px-4 py-3 flex justify-end gap-6 text-sm font-mono bg-ink-50">
          <span className="text-ink-500">Netto: {Number(quote.totalNet).toLocaleString("de-DE")} €</span>
          <span className="font-medium text-ink-900">
            Brutto: {Number(quote.totalGross).toLocaleString("de-DE")} €
          </span>
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
    </div>
  );
}
