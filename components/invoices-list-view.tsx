"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { statusColor } from "@/lib/utils";

type InvoiceRow = {
  id: string;
  number: string;
  customerName: string;
  totalGross: number;
  status: string;
  dueDate: string | null;
  createdAt: string;
};

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

type SortKey = "date_desc" | "date_asc" | "amount_desc" | "amount_asc";

export function InvoicesListView({ invoices }: { invoices: InvoiceRow[] }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("date_desc");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? invoices.filter(
          (inv) => inv.number.toLowerCase().includes(q) || inv.customerName.toLowerCase().includes(q)
        )
      : invoices;

    return [...list].sort((a, b) => {
      switch (sort) {
        case "date_asc":
          return a.createdAt.localeCompare(b.createdAt);
        case "amount_desc":
          return b.totalGross - a.totalGross;
        case "amount_asc":
          return a.totalGross - b.totalGross;
        case "date_desc":
        default:
          return b.createdAt.localeCompare(a.createdAt);
      }
    });
  }, [invoices, search, sort]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Suchen nach Nummer oder Kunde …"
          className="flex-1 min-w-[200px] rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-lg border border-ink-100 px-3 py-2 text-sm bg-surface outline-none focus:border-brand-500"
        >
          <option value="date_desc">Neueste zuerst</option>
          <option value="date_asc">Älteste zuerst</option>
          <option value="amount_desc">Betrag absteigend</option>
          <option value="amount_asc">Betrag aufsteigend</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-card border border-dashed border-ink-100 bg-surface p-8 text-center">
          <p className="text-ink-500 text-sm">Keine Rechnungen gefunden.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((inv) => (
            <Link
              key={inv.id}
              href={`/finanzen/${inv.id}`}
              className={`flex items-center justify-between rounded-lg border-l-4 bg-surface p-4 shadow-card hover:shadow-cardHover transition-shadow ${statusColor[inv.status]}`}
            >
              <div>
                <p className="font-medium text-ink-900">{inv.number}</p>
                <p className="text-sm text-ink-500">{inv.customerName}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-medium text-ink-900">
                  {inv.totalGross.toLocaleString("de-DE")} €
                </p>
                <p className="text-xs text-ink-500">
                  {STATUS_LABELS[inv.status]}
                  {inv.dueDate &&
                    OPEN_INVOICE_STATUSES.includes(inv.status) &&
                    ` · fällig ${new Date(inv.dueDate).toLocaleDateString("de-DE")}`}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
