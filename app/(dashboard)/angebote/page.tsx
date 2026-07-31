import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { statusColor } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Entwurf",
  SENT: "Versendet",
  ACCEPTED: "Angenommen",
  REJECTED: "Abgelehnt",
  EXPIRED: "Abgelaufen",
};

const OPEN_QUOTE_STATUSES = ["DRAFT", "SENT"];

export default async function AngebotePage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const company = await getCurrentCompany();
  const quotes = await prisma.quote.findMany({
    where: { companyId: company.id },
    orderBy: { createdAt: "desc" },
    include: { customer: { select: { name: true } } },
  });

  const statusFilter = searchParams.status;
  const displayedQuotes = statusFilter
    ? quotes.filter((q) =>
        statusFilter === "open" ? OPEN_QUOTE_STATUSES.includes(q.status) : q.status === statusFilter
      )
    : quotes;
  const statusFilterLabel = statusFilter === "open" ? "Offen" : statusFilter ? STATUS_LABELS[statusFilter] : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Angebote</h1>
          <p className="text-sm text-ink-500 mt-1">{quotes.length} Angebote insgesamt</p>
        </div>
        <Link
          href="/angebote/neu"
          className="flex items-center gap-1.5 rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2.5 hover:bg-brand-600 transition-colors"
        >
          <Plus size={16} />
          Neues Angebot
        </Link>
      </div>

      {statusFilterLabel && (
        <div className="flex items-center gap-2 text-sm text-ink-500">
          Gefiltert: <span className="font-medium text-ink-900">{statusFilterLabel}</span>
          <Link href="/angebote" className="text-brand-700 hover:underline">
            Zurücksetzen
          </Link>
        </div>
      )}

      {quotes.length === 0 ? (
        <div className="rounded-card border border-dashed border-ink-100 bg-surface p-12 text-center">
          <p className="text-ink-500 text-sm">Noch keine Angebote vorhanden.</p>
        </div>
      ) : displayedQuotes.length === 0 ? (
        <div className="rounded-card border border-dashed border-ink-100 bg-surface p-8 text-center">
          <p className="text-ink-500 text-sm">Keine Angebote mit diesem Filter.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayedQuotes.map((q) => (
            <Link
              key={q.id}
              href={`/angebote/${q.id}`}
              className={`flex items-center justify-between rounded-lg border-l-4 bg-surface p-4 shadow-card hover:shadow-cardHover transition-shadow ${statusColor[q.status]}`}
            >
              <div>
                <p className="font-medium text-ink-900">{q.title}</p>
                <p className="text-sm text-ink-500">
                  {q.customer.name} · {q.number}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-medium text-ink-900">
                  {Number(q.totalGross).toLocaleString("de-DE")} €
                </p>
                <p className="text-xs text-ink-500">{STATUS_LABELS[q.status]}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
