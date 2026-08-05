"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { LayoutGrid, Table2 } from "lucide-react";
import { InvoicesTableView, type InvoiceRow } from "@/components/invoices-table-view";
import { FilterSwitcher } from "@/components/filter-switcher";
import { saveListViewConfig, type ColumnConfig } from "@/lib/actions/list-view";
import type { FilterEntityState, FilterFieldDef } from "@/lib/actions/filters";
import { INVOICE_STATUS_LABELS } from "@/lib/invoice-columns";
import { statusColor, cn } from "@/lib/utils";

const OPEN_INVOICE_STATUSES = ["SENT", "OPEN", "PARTIALLY_PAID", "OVERDUE"];

// Filterung passiert hier (nicht in der Tabellen-Ansicht), damit sie fuer
// Karten- und Listenansicht gleichermassen gilt.
export function InvoicesView({
  invoices,
  initialViewMode,
  initialColumns,
  initialFilterState,
}: {
  invoices: InvoiceRow[];
  initialViewMode: "cards" | "table";
  initialColumns: ColumnConfig[];
  initialFilterState: FilterEntityState;
}) {
  const [viewMode, setViewMode] = useState(initialViewMode);
  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState(initialFilterState);
  const [, startTransition] = useTransition();

  function setMode(mode: "cards" | "table") {
    setViewMode(mode);
    startTransition(() => saveListViewConfig("invoice", { viewMode: mode, columns: initialColumns }));
  }

  const filterFields: FilterFieldDef[] = useMemo(() => {
    function distinctOptions(pick: (i: InvoiceRow) => string | number | null, format?: (v: string) => string) {
      const values = Array.from(
        new Set(
          invoices
            .map((i) => pick(i))
            .filter((v): v is string | number => v !== null && v !== "")
            .map((v) => String(v))
        )
      ).sort();
      return values.map((v) => ({ value: v, label: format ? format(v) : v }));
    }

    return [
      { key: "customerName", label: "Kunde", options: distinctOptions((i) => i.customerName) },
      {
        key: "status",
        label: "Status",
        options: distinctOptions((i) => i.status, (v) => INVOICE_STATUS_LABELS[v] ?? v),
      },
      {
        key: "dueDate",
        label: "Fällig am",
        options: distinctOptions((i) => i.dueDate, (v) => new Date(v).toLocaleDateString("de-DE")),
      },
    ];
  }, [invoices]);

  const activeFilter = filterState.filters.find((f) => f.id === filterState.activeFilterId) ?? null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (q && !inv.number.toLowerCase().includes(q) && !inv.customerName.toLowerCase().includes(q)) return false;
      if (activeFilter) {
        for (const cond of activeFilter.conditions) {
          if (cond.values.length === 0) continue;
          const raw = inv[cond.field as keyof InvoiceRow];
          const value = raw == null ? "" : String(raw);
          if (!cond.values.includes(value)) return false;
        }
      }
      return true;
    });
  }, [invoices, search, activeFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suchen nach Nummer oder Kunde …"
            className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 min-w-[200px]"
          />
          <FilterSwitcher entity="invoice" fields={filterFields} state={filterState} onStateChange={setFilterState} />
        </div>
        <div className="inline-flex rounded-lg border border-ink-100 overflow-hidden">
          <button
            onClick={() => setMode("cards")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
              viewMode === "cards" ? "bg-brand-500 text-white" : "text-ink-700 hover:bg-ink-50"
            )}
          >
            <LayoutGrid size={14} />
            Karten
          </button>
          <button
            onClick={() => setMode("table")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors border-l border-ink-100",
              viewMode === "table" ? "bg-brand-500 text-white" : "text-ink-700 hover:bg-ink-50"
            )}
          >
            <Table2 size={14} />
            Liste
          </button>
        </div>
      </div>

      {viewMode === "table" ? (
        <InvoicesTableView invoices={filtered} initialConfig={{ viewMode, columns: initialColumns }} />
      ) : filtered.length === 0 ? (
        <div className="rounded-card border border-dashed border-ink-100 bg-surface p-8 text-center">
          <p className="text-ink-500 text-sm">Keine Rechnungen mit diesen Filtern.</p>
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
                  {INVOICE_STATUS_LABELS[inv.status]}
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
