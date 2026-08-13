"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ColumnConfigMenu } from "@/components/column-config-menu";
import { MobileListRow } from "@/components/mobile-list-row";
import { saveListViewConfig, type ColumnConfig } from "@/lib/actions/list-view";
import { QUOTE_COLUMN_LABELS, QUOTE_STATUS_LABELS, type QuoteColumnKey } from "@/lib/quote-columns";
import { statusColor } from "@/lib/utils";

export type QuoteRow = {
  id: string;
  title: string;
  customerName: string;
  number: string;
  status: string;
  totalGross: number;
  validUntil: string | null;
  createdAt: string;
};

const MIN_WIDTH = 70;

function mobileFieldValue(col: ColumnConfig, q: QuoteRow): string {
  switch (col.key) {
    case "customerName":
      return q.customerName;
    case "number":
      return q.number;
    case "status":
      return QUOTE_STATUS_LABELS[q.status] ?? q.status;
    case "totalGross":
      return `${q.totalGross.toLocaleString("de-DE")} €`;
    case "validUntil":
      return q.validUntil ? new Date(q.validUntil).toLocaleDateString("de-DE") : "";
    case "createdAt":
      return new Date(q.createdAt).toLocaleDateString("de-DE");
    default:
      return "";
  }
}

export function QuotesTableView({
  quotes,
  initialConfig,
}: {
  quotes: QuoteRow[];
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
      saveListViewConfig("quote", { viewMode: "table", columns: columnsRef.current });
    }, 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [columns]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveListViewConfig("quote", { viewMode: "table", columns: columnsRef.current });
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
        <ColumnConfigMenu columns={columns} labels={QUOTE_COLUMN_LABELS} onChange={setColumns} />
      </div>

      {quotes.length === 0 ? (
        <div className="rounded-card border border-dashed border-ink-100 bg-surface p-8 text-center">
          <p className="text-ink-500 text-sm">Keine Angebote mit diesen Filtern.</p>
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
                    {QUOTE_COLUMN_LABELS[c.key as QuoteColumnKey] ?? c.key}
                    <div
                      onMouseDown={(e) => startResize(e, c.key, c.width)}
                      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-brand-500/40"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id} className={`border-b border-ink-100 last:border-0 hover:bg-ink-50/50 transition-colors border-l-4 ${statusColor[q.status] ?? ""}`}>
                  <td className="px-3 py-2">
                    <Link href={`/angebote/${q.id}`} className="font-medium text-ink-900 hover:underline truncate block">
                      {q.title}
                    </Link>
                  </td>
                  {visibleColumns.map((col) => (
                    <td key={col.key} className="px-3 py-2 truncate">
                      {col.key === "customerName" && <span className="text-ink-700">{q.customerName}</span>}
                      {col.key === "number" && <span className="font-mono text-ink-500">{q.number}</span>}
                      {col.key === "status" && <span className="text-ink-500">{QUOTE_STATUS_LABELS[q.status] ?? q.status}</span>}
                      {col.key === "totalGross" && (
                        <span className="font-mono text-ink-900">{q.totalGross.toLocaleString("de-DE")} €</span>
                      )}
                      {col.key === "validUntil" && (
                        <span className="text-ink-500">
                          {q.validUntil ? new Date(q.validUntil).toLocaleDateString("de-DE") : "—"}
                        </span>
                      )}
                      {col.key === "createdAt" && (
                        <span className="text-ink-500">{new Date(q.createdAt).toLocaleDateString("de-DE")}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-card border border-ink-100 bg-surface shadow-card sm:hidden">
          {quotes.map((q) => (
            <MobileListRow
              key={q.id}
              href={`/angebote/${q.id}`}
              title={q.title}
              fields={visibleColumns.map((col) => ({
                label: QUOTE_COLUMN_LABELS[col.key as QuoteColumnKey] ?? col.key,
                value: mobileFieldValue(col, q),
              }))}
            />
          ))}
        </div>
        </>
      )}
    </div>
  );
}
