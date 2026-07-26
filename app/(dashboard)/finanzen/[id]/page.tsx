import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileDown } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { InvoiceActions } from "@/components/invoice-actions";

export default async function RechnungDetailPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: { customer: true, items: { orderBy: { position: "asc" } }, project: true },
  });
  if (!invoice) notFound();

  return (
    <div className="space-y-6">
      <Link href="/finanzen" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors">
        <ArrowLeft size={16} /> Zurück zu Finanzen
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Rechnung {invoice.number}</h1>
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
          <a
            href={`/api/rechnungen/${invoice.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-ink-100 text-ink-700 text-sm font-medium px-3 py-2 hover:bg-ink-50 transition-colors"
          >
            <FileDown size={15} />
            PDF
          </a>
          <InvoiceActions invoiceId={invoice.id} status={invoice.status} />
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
        </div>
      </div>
    </div>
  );
}
