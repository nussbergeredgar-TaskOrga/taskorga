"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, CheckCircle2, LayoutGrid, Table2 } from "lucide-react";
import { setTaskStatus } from "@/lib/actions/free-tasks";
import { saveListViewConfig, type ColumnConfig } from "@/lib/actions/list-view";
import type { FilterEntityState, FilterFieldDef } from "@/lib/actions/filters";
import { FilterSwitcher } from "@/components/filter-switcher";
import { TasksTableView, type TaskRow } from "@/components/tasks-table-view";
import { TaskForm, type LinkableRecord } from "@/components/task-form";
import type { FieldConfigMap } from "@/lib/actions/field-config";
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from "@/lib/task-columns";
import { cn } from "@/lib/utils";

type LinkType = "inquiryId" | "quoteId" | "projectId" | "invoiceId" | "appointmentId";

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "border-l-ink-100",
  NORMAL: "border-l-brand-500",
  HIGH: "border-l-warning",
  URGENT: "border-l-danger",
};

// Filterung passiert hier (nicht in der Tabellen-Ansicht), damit sie fuer
// Karten- und Listenansicht gleichermassen gilt.
export function TasksListView({
  tasks,
  users,
  customers,
  linkables,
  fieldConfig,
  initialViewMode,
  initialColumns,
  initialFilterState,
}: {
  tasks: TaskRow[];
  users: { id: string; name: string }[];
  customers: { id: string; name: string }[];
  linkables: Record<LinkType, LinkableRecord[]>;
  fieldConfig?: FieldConfigMap;
  initialViewMode: "cards" | "table";
  initialColumns: ColumnConfig[];
  initialFilterState: FilterEntityState;
}) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState(initialViewMode);
  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState(initialFilterState);
  const [showForm, setShowForm] = useState(false);
  const [, startTransition] = useTransition();

  function setMode(mode: "cards" | "table") {
    setViewMode(mode);
    startTransition(() => saveListViewConfig("task", { viewMode: mode, columns: initialColumns }));
  }

  const filterFields: FilterFieldDef[] = useMemo(() => {
    function distinctOptions(pick: (t: TaskRow) => string | number | null, format?: (v: string) => string) {
      const values = Array.from(
        new Set(
          tasks
            .map((t) => pick(t))
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
        options: distinctOptions((t) => t.status, (v) => TASK_STATUS_LABELS[v] ?? v),
      },
      {
        key: "priority",
        label: "Priorität",
        options: distinctOptions((t) => t.priority, (v) => TASK_PRIORITY_LABELS[v] ?? v),
      },
      { key: "assigneeName", label: "Zuständig", options: distinctOptions((t) => t.assigneeName) },
      { key: "customerName", label: "Kunde", options: distinctOptions((t) => t.customerName) },
    ];
  }, [tasks]);

  const activeFilter = filterState.filters.find((f) => f.id === filterState.activeFilterId) ?? null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (q && !`${t.title} ${t.customerName ?? ""}`.toLowerCase().includes(q)) return false;
      if (activeFilter) {
        for (const cond of activeFilter.conditions) {
          if (cond.values.length === 0) continue;
          const raw = t[cond.field as keyof TaskRow];
          const value = raw == null ? "" : String(raw);
          if (!cond.values.includes(value)) return false;
        }
      }
      return true;
    });
  }, [tasks, search, activeFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suchen …"
            className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
          <FilterSwitcher entity="task" fields={filterFields} state={filterState} onStateChange={setFilterState} />
        </div>
        <div className="flex items-center gap-2">
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
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2.5 hover:bg-brand-600 transition-colors"
          >
            <Plus size={16} />
            Neue Aufgabe
          </button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-card border border-ink-100 bg-surface p-5 shadow-card">
          <TaskForm
            users={users}
            customers={customers}
            linkables={linkables}
            fieldConfig={fieldConfig}
            onDone={() => {
              setShowForm(false);
              router.refresh();
            }}
          />
        </div>
      )}

      {viewMode === "table" ? (
        <TasksTableView tasks={filtered} initialConfig={{ viewMode, columns: initialColumns }} />
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <div
              key={t.id}
              className={cn(
                "rounded-lg border-l-4 bg-ink-50 text-sm",
                PRIORITY_COLORS[t.priority] ?? "border-l-brand-500"
              )}
            >
              {/* Desktop: unveraendert */}
              <div className="hidden items-center justify-between gap-3 px-3 py-2.5 sm:flex">
                <button
                  onClick={() =>
                    setTaskStatus(t.id, t.status === "DONE" ? "OPEN" : "DONE").then(() => router.refresh())
                  }
                  className={cn(
                    "shrink-0",
                    t.status === "DONE" ? "text-success" : "text-ink-300 hover:text-ink-700"
                  )}
                  aria-label="Status umschalten"
                >
                  <CheckCircle2 size={18} />
                </button>
                <Link href={`/aufgaben/${t.id}`} className="flex-1 min-w-0 hover:underline">
                  <span className={cn(t.status === "DONE" && "line-through text-ink-300", "text-ink-900")}>
                    {t.title}
                  </span>
                  {t.customerName && <span className="text-ink-500 ml-2">{t.customerName}</span>}
                </Link>
                <span className="font-mono text-xs text-ink-500 shrink-0">
                  {t.assigneeName && `${t.assigneeName} · `}
                  {t.dueDate && new Date(t.dueDate).toLocaleDateString("de-DE")}
                  {!t.dueDate && TASK_STATUS_LABELS[t.status]}
                </span>
              </div>

              {/* Mobile: zweizeilig, Verantwortlicher nicht in der Schnellansicht */}
              <div className="flex items-start gap-3 px-3 py-2.5 sm:hidden">
                <button
                  onClick={() =>
                    setTaskStatus(t.id, t.status === "DONE" ? "OPEN" : "DONE").then(() => router.refresh())
                  }
                  className={cn(
                    "shrink-0 mt-0.5",
                    t.status === "DONE" ? "text-success" : "text-ink-300 hover:text-ink-700"
                  )}
                  aria-label="Status umschalten"
                >
                  <CheckCircle2 size={18} />
                </button>
                <Link href={`/aufgaben/${t.id}`} className="min-w-0 flex-1 hover:underline">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        t.status === "DONE" && "line-through text-ink-300",
                        "truncate text-ink-900"
                      )}
                    >
                      {t.title}
                    </span>
                    <span className="font-mono text-xs text-ink-500 shrink-0">
                      {t.dueDate ? new Date(t.dueDate).toLocaleDateString("de-DE") : TASK_STATUS_LABELS[t.status]}
                    </span>
                  </div>
                  {t.customerName && <p className="mt-0.5 truncate text-xs text-ink-500">{t.customerName}</p>}
                </Link>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-sm text-ink-300">Keine Aufgaben gefunden.</p>}
        </div>
      )}
    </div>
  );
}
