"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ColumnConfigMenu } from "@/components/column-config-menu";
import { saveListViewConfig, type ColumnConfig } from "@/lib/actions/list-view";
import { APPOINTMENT_COLUMN_LABELS, APPOINTMENT_STATUS_LABELS, type AppointmentColumnKey } from "@/lib/appointment-columns";

export type AppointmentRow = {
  id: string;
  title: string;
  type: string;
  status: string;
  scheduledAt: string | null;
  customerName: string | null;
  amount: number | null;
};

const MIN_WIDTH = 70;

export function TermineTableView({
  appointments,
  initialConfig,
}: {
  appointments: AppointmentRow[];
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
      saveListViewConfig("appointment", { viewMode: "table", columns: columnsRef.current });
    }, 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [columns]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveListViewConfig("appointment", { viewMode: "table", columns: columnsRef.current });
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
        <ColumnConfigMenu columns={columns} labels={APPOINTMENT_COLUMN_LABELS} onChange={setColumns} />
      </div>

      {appointments.length === 0 ? (
        <div className="rounded-card border border-dashed border-ink-100 bg-surface p-8 text-center">
          <p className="text-ink-500 text-sm">Keine Termine mit diesen Filtern.</p>
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
                    {APPOINTMENT_COLUMN_LABELS[c.key as AppointmentColumnKey] ?? c.key}
                    <div
                      onMouseDown={(e) => startResize(e, c.key, c.width)}
                      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-brand-500/40"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/50 transition-colors">
                  <td className="px-3 py-2">
                    <Link href={`/termine/${a.id}`} className="font-medium text-ink-900 hover:underline truncate block">
                      {a.title}
                    </Link>
                  </td>
                  {visibleColumns.map((col) => (
                    <td key={col.key} className="px-3 py-2 truncate">
                      {col.key === "customerName" && <span className="text-ink-700">{a.customerName ?? "—"}</span>}
                      {col.key === "type" && <span className="text-ink-500">{a.type}</span>}
                      {col.key === "status" && <span className="text-ink-500">{APPOINTMENT_STATUS_LABELS[a.status] ?? a.status}</span>}
                      {col.key === "scheduledAt" && (
                        <span className="font-mono text-ink-500">
                          {a.scheduledAt
                            ? new Date(a.scheduledAt).toLocaleString("de-DE", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </span>
                      )}
                      {col.key === "amount" && (
                        <span className="font-mono text-ink-500">{a.amount != null ? `${a.amount.toLocaleString("de-DE")} €` : "—"}</span>
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
