"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { LayoutGrid, Table2 } from "lucide-react";
import { TermineTableView, type AppointmentRow } from "@/components/termine-table-view";
import { FilterSwitcher } from "@/components/filter-switcher";
import { saveListViewConfig, type ColumnConfig } from "@/lib/actions/list-view";
import type { FilterEntityState, FilterFieldDef } from "@/lib/actions/filters";
import { APPOINTMENT_STATUS_LABELS } from "@/lib/appointment-columns";
import { cn } from "@/lib/utils";

// Filterung passiert hier (nicht in der Tabellen-Ansicht), damit sie fuer
// Karten- und Listenansicht gleichermassen gilt.
export function TermineView({
  appointments,
  initialViewMode,
  initialColumns,
  initialFilterState,
}: {
  appointments: AppointmentRow[];
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
    startTransition(() => saveListViewConfig("appointment", { viewMode: mode, columns: initialColumns }));
  }

  const filterFields: FilterFieldDef[] = useMemo(() => {
    function distinctOptions(pick: (a: AppointmentRow) => string | number | null, format?: (v: string) => string) {
      const values = Array.from(
        new Set(
          appointments
            .map((a) => pick(a))
            .filter((v): v is string | number => v !== null && v !== "")
            .map((v) => String(v))
        )
      ).sort();
      return values.map((v) => ({ value: v, label: format ? format(v) : v }));
    }

    return [
      { key: "customerName", label: "Kunde", options: distinctOptions((a) => a.customerName) },
      { key: "type", label: "Art", options: distinctOptions((a) => a.type) },
      {
        key: "status",
        label: "Status",
        options: distinctOptions((a) => a.status, (v) => APPOINTMENT_STATUS_LABELS[v] ?? v),
      },
    ];
  }, [appointments]);

  const activeFilter = filterState.filters.find((f) => f.id === filterState.activeFilterId) ?? null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return appointments
      .filter((a) => {
        if (q && !a.title.toLowerCase().includes(q) && !(a.customerName ?? "").toLowerCase().includes(q)) return false;
        if (activeFilter) {
          for (const cond of activeFilter.conditions) {
            if (cond.values.length === 0) continue;
            const raw = a[cond.field as keyof AppointmentRow];
            const value = raw == null ? "" : String(raw);
            if (!cond.values.includes(value)) return false;
          }
        }
        return true;
      })
      .sort((a, b) => (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? ""));
  }, [appointments, search, activeFilter]);

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
          <FilterSwitcher entity="appointment" fields={filterFields} state={filterState} onStateChange={setFilterState} />
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

      <p className="text-xs text-ink-300">{filtered.length} von {appointments.length} Terminen</p>

      {viewMode === "table" ? (
        <TermineTableView appointments={filtered} initialConfig={{ viewMode, columns: initialColumns }} />
      ) : filtered.length === 0 ? (
        <div className="rounded-card border border-dashed border-ink-100 bg-surface p-8 text-center">
          <p className="text-ink-500 text-sm">Keine Termine mit diesen Filtern.</p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[480px] overflow-y-auto">
          {filtered.map((a) => {
            const dateLabel = a.scheduledAt
              ? new Date(a.scheduledAt).toLocaleString("de-DE", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—";
            return (
              <Link
                key={a.id}
                href={`/termine/${a.id}`}
                className="block rounded-lg border-l-4 border-l-turquoise-500 bg-ink-50 hover:bg-ink-100 text-sm transition-colors"
              >
                {/* Desktop: unveraendert */}
                <div className="hidden items-center justify-between gap-3 px-3 py-2.5 sm:flex">
                  <div className="min-w-0">
                    <span className="font-medium text-ink-900">{a.title}</span>
                    {a.customerName && <span className="text-ink-500 ml-2">{a.customerName}</span>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-xs text-ink-500">
                    <span>{a.type}</span>
                    <span className="font-mono">{dateLabel}</span>
                    <span>{APPOINTMENT_STATUS_LABELS[a.status] ?? a.status}</span>
                  </div>
                </div>

                {/* Mobile: zweizeilig */}
                <div className="px-3 py-2.5 sm:hidden">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-ink-900">{a.title}</span>
                    <span className="font-mono text-xs text-ink-500 shrink-0">{dateLabel}</span>
                  </div>
                  {(a.customerName || a.type) && (
                    <p className="mt-0.5 truncate text-xs text-ink-500">
                      {a.customerName}
                      {a.customerName && a.type ? " · " : ""}
                      {a.type}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
