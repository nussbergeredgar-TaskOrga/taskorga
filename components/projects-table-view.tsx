"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ColumnConfigMenu } from "@/components/column-config-menu";
import { saveListViewConfig, type ColumnConfig } from "@/lib/actions/list-view";
import { PROJECT_COLUMN_LABELS, PROJECT_STATUS_LABELS, type ProjectColumnKey } from "@/lib/project-columns";
import { statusColor } from "@/lib/utils";

export type ProjectRow = {
  id: string;
  title: string;
  customerName: string;
  number: string;
  status: string;
  tasksCount: number;
  startDate: string | null;
  endDate: string | null;
};

const MIN_WIDTH = 70;

export function ProjectsTableView({
  projects,
  initialConfig,
}: {
  projects: ProjectRow[];
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
      saveListViewConfig("project", { viewMode: "table", columns: columnsRef.current });
    }, 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [columns]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveListViewConfig("project", { viewMode: "table", columns: columnsRef.current });
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
        <ColumnConfigMenu columns={columns} labels={PROJECT_COLUMN_LABELS} onChange={setColumns} />
      </div>

      {projects.length === 0 ? (
        <div className="rounded-card border border-dashed border-ink-100 bg-surface p-8 text-center">
          <p className="text-ink-500 text-sm">Keine Aufträge mit diesen Filtern.</p>
        </div>
      ) : (
        <div className="rounded-card border border-ink-100 bg-surface shadow-card overflow-x-auto">
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
                    {PROJECT_COLUMN_LABELS[c.key as ProjectColumnKey] ?? c.key}
                    <div
                      onMouseDown={(e) => startResize(e, c.key, c.width)}
                      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-brand-500/40"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className={`border-b border-ink-100 last:border-0 hover:bg-ink-50/50 transition-colors border-l-4 ${statusColor[p.status] ?? ""}`}>
                  <td className="px-3 py-2">
                    <Link href={`/arbeit/${p.id}`} className="font-medium text-ink-900 hover:underline truncate block">
                      {p.title}
                    </Link>
                  </td>
                  {visibleColumns.map((col) => (
                    <td key={col.key} className="px-3 py-2 truncate">
                      {col.key === "customerName" && <span className="text-ink-700">{p.customerName}</span>}
                      {col.key === "number" && <span className="font-mono text-ink-500">{p.number}</span>}
                      {col.key === "status" && <span className="text-ink-500">{PROJECT_STATUS_LABELS[p.status] ?? p.status}</span>}
                      {col.key === "tasksCount" && <span className="font-mono text-ink-500">{p.tasksCount}</span>}
                      {col.key === "startDate" && (
                        <span className="text-ink-500">{p.startDate ? new Date(p.startDate).toLocaleDateString("de-DE") : "—"}</span>
                      )}
                      {col.key === "endDate" && (
                        <span className="text-ink-500">{p.endDate ? new Date(p.endDate).toLocaleDateString("de-DE") : "—"}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
