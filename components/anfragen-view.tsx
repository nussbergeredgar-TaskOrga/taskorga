"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { LayoutGrid, Table2 } from "lucide-react";
import { AnfragenTableView, type InquiryRow } from "@/components/anfragen-table-view";
import { FilterSwitcher } from "@/components/filter-switcher";
import { saveListViewConfig, type ColumnConfig } from "@/lib/actions/list-view";
import type { FilterEntityState, FilterFieldDef } from "@/lib/actions/filters";
import { cn } from "@/lib/utils";

// Filterung passiert hier (nicht in der Tabellen-Ansicht), damit sie fuer
// Karten- und Listenansicht gleichermassen gilt.
export function AnfragenView({
  inquiries,
  initialViewMode,
  initialColumns,
  initialFilterState,
}: {
  inquiries: InquiryRow[];
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
    startTransition(() => saveListViewConfig("inquiry", { viewMode: mode, columns: initialColumns }));
  }

  const filterFields: FilterFieldDef[] = useMemo(() => {
    function distinctOptions(pick: (i: InquiryRow) => string | number | null, format?: (v: string) => string) {
      const values = Array.from(
        new Set(
          inquiries
            .map((i) => pick(i))
            .filter((v): v is string | number => v !== null && v !== "")
            .map((v) => String(v))
        )
      ).sort();
      return values.map((v) => ({ value: v, label: format ? format(v) : v }));
    }

    return [
      { key: "customerName", label: "Kunde", options: distinctOptions((i) => i.customerName) },
      { key: "stepLabel", label: "Schritt", options: distinctOptions((i) => i.stepLabel) },
      { key: "source", label: "Quelle", options: distinctOptions((i) => i.source) },
      { key: "amount", label: "Betrag", options: distinctOptions((i) => i.amount) },
      {
        key: "createdAt",
        label: "Erstellt am",
        options: distinctOptions((i) => i.createdAt, (v) => new Date(v).toLocaleDateString("de-DE")),
      },
    ];
  }, [inquiries]);

  const activeFilter = filterState.filters.find((f) => f.id === filterState.activeFilterId) ?? null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inquiries.filter((i) => {
      if (q && !i.title.toLowerCase().includes(q) && !i.customerName.toLowerCase().includes(q)) return false;
      if (activeFilter) {
        for (const cond of activeFilter.conditions) {
          if (cond.values.length === 0) continue;
          const raw = i[cond.field as keyof InquiryRow];
          const value = raw == null ? "" : String(raw);
          if (!cond.values.includes(value)) return false;
        }
      }
      return true;
    });
  }, [inquiries, search, activeFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suchen nach Titel oder Kunde …"
            className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 min-w-[200px]"
          />
          <FilterSwitcher entity="inquiry" fields={filterFields} state={filterState} onStateChange={setFilterState} />
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
        <AnfragenTableView inquiries={filtered} initialConfig={{ viewMode, columns: initialColumns }} />
      ) : filtered.length === 0 ? (
        <div className="rounded-card border border-dashed border-ink-100 bg-surface p-8 text-center">
          <p className="text-ink-500 text-sm">Keine Anfragen mit diesen Filtern.</p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[480px] overflow-y-auto">
          {filtered.map((i) => {
            const dateLabel = new Date(i.createdAt).toLocaleDateString("de-DE");
            return (
              <Link
                key={i.id}
                href={`/anfragen/${i.id}`}
                className="block rounded-lg border-l-4 border-l-brand-500 bg-ink-50 hover:bg-ink-100 text-sm transition-colors"
              >
                {/* Desktop: unveraendert */}
                <div className="hidden items-center justify-between gap-3 px-3 py-2.5 sm:flex">
                  <div className="min-w-0">
                    <span className="font-medium text-ink-900">{i.title}</span>
                    <span className="text-ink-500 ml-2">{i.customerName}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-xs text-ink-500">
                    <span>{i.stepLabel}</span>
                    <span className="font-mono">{dateLabel}</span>
                    {i.amount != null && <span className="font-mono">{i.amount.toLocaleString("de-DE")} €</span>}
                  </div>
                </div>

                {/* Mobile: zweizeilig */}
                <div className="px-3 py-2.5 sm:hidden">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-ink-900">{i.title}</span>
                    <span className="font-mono text-xs text-ink-500 shrink-0">{dateLabel}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-ink-500">
                    {i.customerName}
                    {i.customerName && i.stepLabel ? " · " : ""}
                    {i.stepLabel}
                    {i.amount != null ? ` · ${i.amount.toLocaleString("de-DE")} €` : ""}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
