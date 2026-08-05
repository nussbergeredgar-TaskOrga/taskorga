"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { LayoutGrid, Table2, FileText } from "lucide-react";
import { ExpensesTableView, type ExpenseRow } from "@/components/expenses-table-view";
import { FilterSwitcher } from "@/components/filter-switcher";
import { saveListViewConfig, type ColumnConfig } from "@/lib/actions/list-view";
import type { FilterEntityState, FilterFieldDef } from "@/lib/actions/filters";
import { updateExpenseStatus } from "@/lib/actions/expenses";
import { EXPENSE_STATUS_LABELS } from "@/lib/expense-columns";
import { cn } from "@/lib/utils";

// Filterung passiert hier (nicht in der Tabellen-Ansicht), damit sie fuer
// Karten- und Listenansicht gleichermassen gilt.
export function ExpensesView({
  expenses,
  initialViewMode,
  initialColumns,
  initialFilterState,
}: {
  expenses: ExpenseRow[];
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
    startTransition(() => saveListViewConfig("expense", { viewMode: mode, columns: initialColumns }));
  }

  const filterFields: FilterFieldDef[] = useMemo(() => {
    function distinctOptions(pick: (e: ExpenseRow) => string | number | null, format?: (v: string) => string) {
      const values = Array.from(
        new Set(
          expenses
            .map((e) => pick(e))
            .filter((v): v is string | number => v !== null && v !== "")
            .map((v) => String(v))
        )
      ).sort();
      return values.map((v) => ({ value: v, label: format ? format(v) : v }));
    }

    return [
      {
        key: "status",
        label: "Status",
        options: distinctOptions((e) => e.status, (v) => EXPENSE_STATUS_LABELS[v] ?? v),
      },
      { key: "category", label: "Kategorie", options: distinctOptions((e) => e.category) },
      { key: "projectNumber", label: "Auftrag", options: distinctOptions((e) => e.projectNumber) },
    ];
  }, [expenses]);

  const activeFilter = filterState.filters.find((f) => f.id === filterState.activeFilterId) ?? null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses.filter((e) => {
      if (q && !e.title.toLowerCase().includes(q) && !(e.category ?? "").toLowerCase().includes(q)) return false;
      if (activeFilter) {
        for (const cond of activeFilter.conditions) {
          if (cond.values.length === 0) continue;
          const raw = e[cond.field as keyof ExpenseRow];
          const value = raw == null ? "" : String(raw);
          if (!cond.values.includes(value)) return false;
        }
      }
      return true;
    });
  }, [expenses, search, activeFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suchen nach Titel oder Kategorie …"
            className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 min-w-[200px]"
          />
          <FilterSwitcher entity="expense" fields={filterFields} state={filterState} onStateChange={setFilterState} />
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
        <ExpensesTableView expenses={filtered} initialConfig={{ viewMode, columns: initialColumns }} />
      ) : filtered.length === 0 ? (
        <div className="rounded-card border border-dashed border-ink-100 bg-surface p-8 text-center">
          <p className="text-ink-500 text-sm">Keine Ausgaben mit diesen Filtern.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 rounded-lg bg-ink-50 px-3 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-ink-900 truncate">{e.title}</p>
                <p className="text-xs text-ink-500">
                  {new Date(e.date).toLocaleDateString("de-DE")}
                  {e.category && ` · ${e.category}`}
                  {e.projectId && (
                    <>
                      {" · "}
                      <Link href={`/arbeit/${e.projectId}`} className="text-brand-700 hover:underline">
                        {e.projectNumber}
                      </Link>
                    </>
                  )}
                  {e.documentId && (
                    <>
                      {" · "}
                      <a
                        href={`/api/files/${e.documentId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-brand-700 hover:underline"
                      >
                        <FileText size={11} /> Beleg
                      </a>
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-mono text-sm font-medium text-ink-900">{e.amount.toLocaleString("de-DE")} €</span>
                <button
                  onClick={() => startTransition(() => updateExpenseStatus(e.id, e.status === "OPEN" ? "PAID" : "OPEN"))}
                  className="text-xs font-medium text-brand-700 hover:underline whitespace-nowrap"
                >
                  {e.status === "OPEN" ? "Als bezahlt markieren" : "Als offen markieren"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
