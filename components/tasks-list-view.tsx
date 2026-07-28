"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, CheckCircle2 } from "lucide-react";
import { setTaskStatus } from "@/lib/actions/free-tasks";
import { TaskForm, type LinkableRecord } from "@/components/task-form";
import type { FieldConfigMap } from "@/lib/actions/field-config";
import { cn } from "@/lib/utils";

type LinkType = "inquiryId" | "quoteId" | "projectId" | "invoiceId" | "appointmentId";

type TaskRow = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: Date | null;
  assigneeName: string | null;
  customerName: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Offen",
  IN_PROGRESS: "In Arbeit",
  DONE: "Erledigt",
  CANCELLED: "Storniert",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "border-l-ink-100",
  NORMAL: "border-l-brand-500",
  HIGH: "border-l-warning",
  URGENT: "border-l-danger",
};

export function TasksListView({
  tasks,
  users,
  customers,
  linkables,
  fieldConfig,
  initialStatusFilter,
}: {
  tasks: TaskRow[];
  users: { id: string; name: string }[];
  customers: { id: string; name: string }[];
  linkables: Record<LinkType, LinkableRecord[]>;
  fieldConfig?: FieldConfigMap;
  initialStatusFilter?: string;
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter ?? "");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const filtered = tasks.filter((t) => {
    if (statusFilter === "OPEN_ALL" && t.status !== "OPEN" && t.status !== "IN_PROGRESS") return false;
    if (statusFilter && statusFilter !== "OPEN_ALL" && t.status !== statusFilter) return false;
    if (search && !`${t.title} ${t.customerName ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suchen …"
            className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-ink-100 px-3 py-2 text-sm bg-surface outline-none focus:border-brand-500"
          >
            <option value="">Alle Status</option>
            <option value="OPEN_ALL">Offen (alle)</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2.5 hover:bg-brand-600 transition-colors"
        >
          <Plus size={16} />
          Neue Aufgabe
        </button>
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

      <div className="space-y-2">
        {filtered.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-center justify-between gap-3 rounded-lg border-l-4 bg-ink-50 px-3 py-2.5 text-sm",
              PRIORITY_COLORS[t.priority] ?? "border-l-brand-500"
            )}
          >
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
              {!t.dueDate && STATUS_LABELS[t.status]}
            </span>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-ink-300">Keine Aufgaben gefunden.</p>}
      </div>
    </div>
  );
}
