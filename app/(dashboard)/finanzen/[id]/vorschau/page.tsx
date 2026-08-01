import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { InvoiceSendFromPreview } from "@/components/invoice-send-from-preview";

export default async function RechnungVorschauPage({ params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, companyId: admin.companyId },
    include: { customer: { select: { email: true } } },
  });
  if (!invoice) notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link
          href={`/finanzen/${invoice.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors"
        >
          <ArrowLeft size={16} /> Zurück zur Rechnung
        </Link>
        <a
          href={`/api/rechnungen/${invoice.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-ink-500 hover:text-ink-900 transition-colors"
        >
          <ExternalLink size={13} /> In neuem Tab öffnen
        </a>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Vorschau: Rechnung {invoice.number}</h1>
        <p className="text-sm text-ink-500 mt-1">
          Prüfe Positionen, Beträge und Adresse, bevor du versendest.
        </p>
      </div>

      <div className="rounded-card border border-ink-100 bg-surface p-2 shadow-card">
        <iframe
          src={`/api/rechnungen/${invoice.id}/pdf`}
          className="w-full h-[75vh] rounded-lg"
          title={`Vorschau Rechnung ${invoice.number}`}
        />
      </div>

      <div className="rounded-card border border-ink-100 bg-surface p-5 shadow-card">
        <InvoiceSendFromPreview invoiceId={invoice.id} hasCustomerEmail={!!invoice.customer.email} />
      </div>
    </div>
  );
}
