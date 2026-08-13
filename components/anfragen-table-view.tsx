"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ColumnConfigMenu } from "@/components/column-config-menu";
import { EditableCell } from "@/components/editable-cell";
import { MobileListRow } from "@/components/mobile-list-row";
import { saveListViewConfig, type ColumnConfig } from "@/lib/actions/list-view";
import { updateInquiryField } from "@/lib/actions/inquiries";
import { INQUIRY_COLUMN_LABELS, type InquiryColumnKey } from "@/lib/inquiry-columns";

export type InquiryRow = {
  id: string;
  title: string;
  customerName: string;
  status: string;
  stepLabel: string;
  source: string | null;
  amount: number | null;
  createdAt: string;
};

const MIN_WIDTH = 70;

function mobileFieldValue(col: ColumnConfig, i: InquiryRow): string {
  switch (col.key) {
    case "customerName":
      return i.customerName;
    case "stepLabel":
      return i.stepLabel;
    case "status":
      return i.status;
    case "source":
      return i.source ?? "";
    case "amount":
      return i.amount != null ? String(i.amount) : "";
    case "createdAt":
      return new Date(i.createdAt).toLocaleDateString("de-DE");
    default:
      return "";
  }
}

export function AnfragenTableView({
  inquiries,
  initialConfig,
}: {
  inquiries: InquiryRow[];
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
      saveListViewConfig("inquiry", { viewMode: "table", columns: columnsRef.current });
    }, 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [columns]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveListViewConfig("inquiry", { viewMode: "table", columns: columnsRef.current });
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
        <ColumnConfigMenu columns={columns} labels={INQUIRY_COLUMN_LABELS} onChange={setColumns} />
      </div>

      {inquiries.length === 0 ? (
        <div className="rounded-card border border-dashed border-ink-100 bg-surface p-8 text-center">
          <p className="text-ink-500 text-sm">Keine Anfragen mit diesen Filtern.</p>
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
                    {INQUIRY_COLUMN_LABELS[c.key as InquiryColumnKey] ?? c.key}
                    <div
                      onMouseDown={(e) => startResize(e, c.key, c.width)}
                      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-brand-500/40"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inquiries.map((i) => (
                <tr key={i.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/50 transition-colors">
                  <td className="px-3 py-2">
                    <Link href={`/anfragen/${i.id}`} className="font-medium text-ink-900 hover:underline truncate block">
                      {i.title}
                    </Link>
                  </td>
                  {visibleColumns.map((col) => (
                    <td key={col.key} className="px-3 py-2 truncate">
                      {col.key === "customerName" && <span className="text-ink-700">{i.customerName}</span>}
                      {col.key === "stepLabel" && <span className="text-ink-500">{i.stepLabel}</span>}
                      {col.key === "status" && <span className="text-ink-500">{i.status}</span>}
                      {col.key === "source" && (
                        <EditableCell recordId={i.id} field="source" value={i.source ?? ""} onSave={updateInquiryField} />
                      )}
                      {col.key === "amount" && (
                        <EditableCell
                          recordId={i.id}
                          field="amount"
                          value={i.amount != null ? String(i.amount) : ""}
                          onSave={updateInquiryField}
                        />
                      )}
                      {col.key === "createdAt" && (
                        <span className="text-ink-500">{new Date(i.createdAt).toLocaleDateString("de-DE")}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-card border border-ink-100 bg-surface shadow-card sm:hidden">
          {inquiries.map((i) => (
            <MobileListRow
              key={i.id}
              href={`/anfragen/${i.id}`}
              title={i.title}
              fields={visibleColumns.map((col) => ({
                label: INQUIRY_COLUMN_LABELS[col.key as InquiryColumnKey] ?? col.key,
                value: mobileFieldValue(col, i),
              }))}
            />
          ))}
        </div>
        </>
      )}
    </div>
  );
}
