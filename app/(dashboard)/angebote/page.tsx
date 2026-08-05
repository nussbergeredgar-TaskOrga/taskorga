import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { QuotesView } from "@/components/quotes-view";
import { getListViewConfig } from "@/lib/actions/list-view";
import { getFilterState } from "@/lib/actions/filters";
import { QUOTE_COLUMNS_DEFAULT, QUOTE_STATUS_LABELS } from "@/lib/quote-columns";

const OPEN_QUOTE_STATUSES = ["DRAFT", "SENT"];

export default async function AngebotePage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const company = await getCurrentCompany();
  const [quotes, savedListConfig, filterState] = await Promise.all([
    prisma.quote.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
      include: { customer: { select: { name: true } } },
    }),
    getListViewConfig("quote"),
    getFilterState("quote"),
  ]);

  const savedColumns = savedListConfig?.columns ?? [];
  const savedColumnKeys = new Set(savedColumns.map((c) => c.key));
  const missingColumns = QUOTE_COLUMNS_DEFAULT.filter((c) => !savedColumnKeys.has(c.key));
  const quoteColumns = [...savedColumns, ...missingColumns];

  const statusFilter = searchParams.status;
  const displayedQuotes = statusFilter
    ? quotes.filter((q) =>
        statusFilter === "open" ? OPEN_QUOTE_STATUSES.includes(q.status) : q.status === statusFilter
      )
    : quotes;
  const statusFilterLabel = statusFilter === "open" ? "Offen" : statusFilter ? QUOTE_STATUS_LABELS[statusFilter] : null;

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
        <QuotesView
          quotes={displayedQuotes.map((q) => ({
            id: q.id,
            title: q.title,
            customerName: q.customer.name,
            number: q.number,
            status: q.status,
            totalGross: Number(q.totalGross),
            validUntil: q.validUntil ? q.validUntil.toISOString() : null,
            createdAt: q.createdAt.toISOString(),
          }))}
          initialViewMode={savedListConfig?.viewMode ?? "cards"}
          initialColumns={quoteColumns}
          initialFilterState={filterState}
        />
      )}
    </div>
  );
}
