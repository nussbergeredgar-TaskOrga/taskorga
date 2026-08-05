"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ColumnConfigMenu } from "@/components/column-config-menu";
import { saveListViewConfig, type ColumnConfig } from "@/lib/actions/list-view";
import { INVOICE_COLUMN_LABELS, INVOICE_STATUS_LABELS, type InvoiceColumnKey } from "@/lib/invoice-columns";
import { statusColor } from "@/lib/utils";

export type InvoiceRow = {
  id: string;
  number: string;
  customerName: string;
  totalGross: number;
  status: string;
  dueDate: string | null;
  createdAt: string;
};

const MIN_WIDTH = 70;

export function InvoicesTableView({
  invoices,
  initialConfig,
}: {
  invoices: InvoiceRow[];
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
      saveListViewConfig("invoice", { viewMode: "table", columns: columnsRef.current });
    }, 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [columns]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveListViewConfig("invoice", { viewMode: "table", columns: columnsRef.current });
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
        <ColumnConfigMenu columns={columns} labels={INVOICE_COLUMN_LABELS} onChange={setColumns} />
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-card border border-dashed border-ink-100 bg-surface p-8 text-center">
          <p className="text-ink-500 text-sm">Keine Rechnungen mit diesen Filtern.</p>
        </div>
      ) : (
        <div className="rounded-card border border-ink-100 bg-surface shadow-card overflow-x-auto">
          <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
            <thead>
              <tr className="border-b border-ink-100">
                <th className="text-left font-medium text-ink-500 px-3 py-2.5" style={{ width: 150 }}>
                  Nummer
                </th>
                {visibleColumns.map((c) => (
                  <th
                    key={c.key}
                    className="relative text-left font-medium text-ink-500 px-3 py-2.5"
                    style={{ width: c.width }}
                  >
                    {INVOICE_COLUMN_LABELS[c.key as InvoiceColumnKey] ?? c.key}
                    <div
                      onMouseDown={(e) => startResize(e, c.key, c.width)}
                      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-brand-500/40"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className={`border-b border-ink-100 last:border-0 hover:bg-ink-50/50 transition-colors border-l-4 ${statusColor[inv.status] ?? ""}`}>
                  <td className="px-3 py-2">
                    <Link href={`/finanzen/${inv.id}`} className="font-medium text-ink-900 hover:underline truncate block">
                      {inv.number}
                    </Link>
                  </td>
                  {visibleColumns.map((col) => (
                    <td key={col.key} className="px-3 py-2 truncate">
                      {col.key === "customerName" && <span className="text-ink-700">{inv.customerName}</span>}
                      {col.key === "status" && <span className="text-ink-500">{INVOICE_STATUS_LABELS[inv.status] ?? inv.status}</span>}
                      {col.key === "totalGross" && (
                        <span className="font-mono text-ink-900">{inv.totalGross.toLocaleString("de-DE")} €</span>
                      )}
                      {col.key === "dueDate" && (
                        <span className="text-ink-500">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("de-DE") : "—"}</span>
                      )}
                      {col.key === "createdAt" && (
                        <span className="text-ink-500">{new Date(inv.createdAt).toLocaleDateString("de-DE")}</span>
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
