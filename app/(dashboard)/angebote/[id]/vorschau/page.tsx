import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { QuoteSendFromPreview } from "@/components/quote-send-from-preview";
import { getCurrentCompany } from "@/lib/session";

export default async function AngebotVorschauPage({ params }: { params: { id: string } }) {
  const company = await getCurrentCompany();
  const quote = await prisma.quote.findFirst({
    where: { id: params.id, companyId: company.id },
    include: { customer: { select: { email: true } } },
  });
  if (!quote) notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link
          href={`/angebote/${quote.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors"
        >
          <ArrowLeft size={16} /> Zurück zum Angebot
        </Link>
        <a
          href={`/api/angebote/${quote.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-ink-500 hover:text-ink-900 transition-colors"
        >
          <ExternalLink size={13} /> In neuem Tab öffnen
        </a>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Vorschau: Angebot {quote.number}</h1>
        <p className="text-sm text-ink-500 mt-1">
          Prüfe Positionen, Beträge und Adresse, bevor du versendest.
        </p>
      </div>

      <div className="rounded-card border border-ink-100 bg-surface p-2 shadow-card">
        <iframe
          src={`/api/angebote/${quote.id}/pdf`}
          className="w-full h-[75vh] rounded-lg"
          title={`Vorschau Angebot ${quote.number}`}
        />
      </div>

      <div className="rounded-card border border-ink-100 bg-surface p-5 shadow-card">
        <QuoteSendFromPreview quoteId={quote.id} hasCustomerEmail={!!quote.customer.email} />
      </div>
    </div>
  );
}
