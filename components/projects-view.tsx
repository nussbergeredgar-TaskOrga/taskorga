"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { LayoutGrid, Table2 } from "lucide-react";
import { ProjectsTableView, type ProjectRow } from "@/components/projects-table-view";
import { FilterSwitcher } from "@/components/filter-switcher";
import { saveListViewConfig, type ColumnConfig } from "@/lib/actions/list-view";
import type { FilterEntityState, FilterFieldDef } from "@/lib/actions/filters";
import { PROJECT_STATUS_LABELS } from "@/lib/project-columns";
import { statusColor, cn } from "@/lib/utils";

// Filterung passiert hier (nicht in der Tabellen-Ansicht), damit sie fuer
// Karten- und Listenansicht gleichermassen gilt.
export function ProjectsView({
  projects,
  initialViewMode,
  initialColumns,
  initialFilterState,
}: {
  projects: ProjectRow[];
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
    startTransition(() => saveListViewConfig("project", { viewMode: mode, columns: initialColumns }));
  }

  const filterFields: FilterFieldDef[] = useMemo(() => {
    function distinctOptions(pick: (p: ProjectRow) => string | number | null, format?: (v: string) => string) {
      const values = Array.from(
        new Set(
          projects
            .map((p) => pick(p))
            .filter((v): v is string | number => v !== null && v !== "")
            .map((v) => String(v))
        )
      ).sort();
      return values.map((v) => ({ value: v, label: format ? format(v) : v }));
    }

    return [
      { key: "customerName", label: "Kunde", options: distinctOptions((p) => p.customerName) },
      {
        key: "status",
        label: "Status",
        options: distinctOptions((p) => p.status, (v) => PROJECT_STATUS_LABELS[v] ?? v),
      },
      {
        key: "startDate",
        label: "Start",
        options: distinctOptions((p) => p.startDate, (v) => new Date(v).toLocaleDateString("de-DE")),
      },
      {
        key: "endDate",
        label: "Ende",
        options: distinctOptions((p) => p.endDate, (v) => new Date(v).toLocaleDateString("de-DE")),
      },
    ];
  }, [projects]);

  const activeFilter = filterState.filters.find((f) => f.id === filterState.activeFilterId) ?? null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (
        q &&
        !p.title.toLowerCase().includes(q) &&
        !p.customerName.toLowerCase().includes(q) &&
        !p.number.toLowerCase().includes(q)
      )
        return false;
      if (activeFilter) {
        for (const cond of activeFilter.conditions) {
          if (cond.values.length === 0) continue;
          const raw = p[cond.field as keyof ProjectRow];
          const value = raw == null ? "" : String(raw);
          if (!cond.values.includes(value)) return false;
        }
      }
      return true;
    });
  }, [projects, search, activeFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suchen nach Titel, Kunde oder Nummer …"
            className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 min-w-[200px]"
          />
          <FilterSwitcher entity="project" fields={filterFields} state={filterState} onStateChange={setFilterState} />
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
        <ProjectsTableView projects={filtered} initialConfig={{ viewMode, columns: initialColumns }} />
      ) : filtered.length === 0 ? (
        <div className="rounded-card border border-dashed border-ink-100 bg-surface p-8 text-center">
          <p className="text-ink-500 text-sm">Keine Aufträge mit diesen Filtern.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <Link
              key={p.id}
              href={`/arbeit/${p.id}`}
              className={`rounded-card border-l-4 bg-surface p-5 shadow-card hover:shadow-cardHover transition-shadow ${statusColor[p.status]}`}
            >
              <h3 className="font-display font-semibold text-ink-900">{p.title}</h3>
              <p className="text-sm text-ink-500 mt-0.5">
                {p.customerName} · {p.number}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs font-mono text-ink-500">{p.tasksCount} Aufgaben</span>
                <span className="text-xs font-medium text-ink-700">{PROJECT_STATUS_LABELS[p.status] ?? p.status}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
