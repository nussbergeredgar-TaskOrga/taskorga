"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ColumnConfigMenu } from "@/components/column-config-menu";
import { EditableCell } from "@/components/editable-cell";
import { MobileListRow } from "@/components/mobile-list-row";
import { saveListViewConfig, type ColumnConfig } from "@/lib/actions/list-view";
import { setTaskStatus } from "@/lib/actions/free-tasks";
import { TASK_COLUMN_LABELS, TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, type TaskColumnKey } from "@/lib/task-columns";
import type { TaskStatus } from "@prisma/client";

export type TaskRow = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  assigneeName: string | null;
  customerName: string | null;
};

const STATUS_OPTIONS = Object.entries(TASK_STATUS_LABELS).map(([value, label]) => ({ value, label }));
const MIN_WIDTH = 70;

async function saveStatus(taskId: string, _field: string, value: string) {
  await setTaskStatus(taskId, value as TaskStatus);
}

function mobileFieldValue(col: ColumnConfig, t: TaskRow): string {
  switch (col.key) {
    case "status":
      return TASK_STATUS_LABELS[t.status] ?? t.status;
    case "dueDate":
      return t.dueDate ? new Date(t.dueDate).toLocaleDateString("de-DE") : "";
    case "assigneeName":
      return t.assigneeName ?? "";
    case "priority":
      return TASK_PRIORITY_LABELS[t.priority] ?? t.priority;
    case "customerName":
      return t.customerName ?? "";
    default:
      return "";
  }
}

export function TasksTableView({
  tasks,
  initialConfig,
}: {
  tasks: TaskRow[];
  initialConfig: { viewMode: "cards" | "table"; columns: ColumnConfig[] };
}) {
  const [columns, setColumns] = useState(initialConfig.columns);
  const resizeRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const columnsRef = useRef(columns);
  columnsRef.current = columns;
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveListViewConfig("task", { viewMode: "table", columns: columnsRef.current });
    }, 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [columns]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveListViewConfig("task", { viewMode: "table", columns: columnsRef.current });
      }
    };
  }, []);

  function startResize(e: React.MouseEvent, key: string, currentWidth: number) {
    e.preventDefault();
    resizeRef.current = { key, startX: e.clientX, startWidth: currentWidth };
    function onMove(ev: MouseEvent) {
      if (!resizeRef.current) return;
      const { key, startX, startWidth } = resizeRef.current;
      const delta = ev.clientX - startX;
      const nextWidth = Math.max(MIN_WIDTH, startWidth + delta);
      setColumns((prev) => prev.map((c) => (c.key === key ? { ...c, width: nextWidth } : c)));
    }
    function onUp() {
      resizeRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const visibleColumns = [...columns].filter((c) => c.visible).sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ColumnConfigMenu columns={columns} labels={TASK_COLUMN_LABELS} onChange={setColumns} />
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-card border border-dashed border-ink-100 bg-surface p-8 text-center">
          <p className="text-ink-500 text-sm">Keine Aufgaben mit diesen Filtern.</p>
        </div>
      ) : (
        <>
        <div className="hidden rounded-card border border-ink-100 bg-surface shadow-card overflow-x-auto sm:block">
          <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
            <thead>
              <tr className="border-b border-ink-100">
                <th className="text-left font-medium text-ink-500 px-3 py-2.5" style={{ width: 220 }}>
                  Titel
                </th>
                {visibleColumns.map((c) => (
                  <th
                    key={c.key}
                    className="relative text-left font-medium text-ink-500 px-3 py-2.5"
                    style={{ width: c.width }}
                  >
                    {TASK_COLUMN_LABELS[c.key as TaskColumnKey] ?? c.key}
                    <div
                      onMouseDown={(e) => startResize(e, c.key, c.width)}
                      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-brand-500/40"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/50 transition-colors">
                  <td className="px-3 py-2">
                    <Link
                      href={`/aufgaben/${t.id}`}
                      className={`font-medium hover:underline truncate block ${t.status === "DONE" ? "line-through text-ink-300" : "text-ink-900"}`}
                    >
                      {t.title}
                    </Link>
                  </td>
                  {visibleColumns.map((col) => (
                    <td key={col.key} className="px-3 py-2 truncate">
                      {col.key === "status" && (
                        <EditableCell recordId={t.id} field="status" value={t.status} type="select" options={STATUS_OPTIONS} onSave={saveStatus} />
                      )}
                      {col.key === "dueDate" && (
                        <span className="text-ink-500">{t.dueDate ? new Date(t.dueDate).toLocaleDateString("de-DE") : "—"}</span>
                      )}
                      {col.key === "assigneeName" && <span className="text-ink-700">{t.assigneeName ?? "—"}</span>}
                      {col.key === "priority" && <span className="text-ink-500">{TASK_PRIORITY_LABELS[t.priority] ?? t.priority}</span>}
                      {col.key === "customerName" && <span className="text-ink-700">{t.customerName ?? "—"}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-card border border-ink-100 bg-surface shadow-card sm:hidden">
          {tasks.map((t) => (
            <MobileListRow
              key={t.id}
              href={`/aufgaben/${t.id}`}
              title={t.title}
              titleClassName={t.status === "DONE" ? "line-through text-ink-300" : "font-medium text-ink-900"}
              fields={visibleColumns.map((col) => ({
                label: TASK_COLUMN_LABELS[col.key as TaskColumnKey] ?? col.key,
                value: mobileFieldValue(col, t),
              }))}
            />
          ))}
        </div>
        </>
      )}
    </div>
  );
}
