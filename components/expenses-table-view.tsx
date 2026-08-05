"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { ColumnConfigMenu } from "@/components/column-config-menu";
import { EditableCell } from "@/components/editable-cell";
import { saveListViewConfig, type ColumnConfig } from "@/lib/actions/list-view";
import { updateExpenseStatus } from "@/lib/actions/expenses";
import { EXPENSE_COLUMN_LABELS, EXPENSE_STATUS_LABELS, type ExpenseColumnKey } from "@/lib/expense-columns";
import type { ExpenseStatus } from "@prisma/client";

export type ExpenseRow = {
  id: string;
  title: string;
  category: string | null;
  amount: number;
  date: string;
  status: string;
  documentId: string | null;
  projectId: string | null;
  projectNumber: string | null;
};

const STATUS_OPTIONS = Object.entries(EXPENSE_STATUS_LABELS).map(([value, label]) => ({ value, label }));
const MIN_WIDTH = 70;

async function saveStatus(expenseId: string, _field: string, value: string) {
  await updateExpenseStatus(expenseId, value as ExpenseStatus);
}

export function ExpensesTableView({
  expenses,
  initialConfig,
}: {
  expenses: ExpenseRow[];
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
      saveListViewConfig("expense", { viewMode: "table", columns: columnsRef.current });
    }, 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [columns]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveListViewConfig("expense", { viewMode: "table", columns: columnsRef.current });
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
        <ColumnConfigMenu columns={columns} labels={EXPENSE_COLUMN_LABELS} onChange={setColumns} />
      </div>

      {expenses.length === 0 ? (
        <div className="rounded-card border border-dashed border-ink-100 bg-surface p-8 text-center">
          <p className="text-ink-500 text-sm">Keine Ausgaben mit diesen Filtern.</p>
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
                    {EXPENSE_COLUMN_LABELS[c.key as ExpenseColumnKey] ?? c.key}
                    <div
                      onMouseDown={(e) => startResize(e, c.key, c.width)}
                      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-brand-500/40"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/50 transition-colors">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-ink-900 truncate">{e.title}</span>
                      {e.documentId && (
                        <a
                          href={`/api/files/${e.documentId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-brand-700 hover:text-brand-800"
                          aria-label="Beleg öffnen"
                        >
                          <FileText size={13} />
                        </a>
                      )}
                    </div>
                  </td>
                  {visibleColumns.map((col) => (
                    <td key={col.key} className="px-3 py-2 truncate">
                      {col.key === "status" && (
                        <EditableCell recordId={e.id} field="status" value={e.status} type="select" options={STATUS_OPTIONS} onSave={saveStatus} />
                      )}
                      {col.key === "amount" && <span className="font-mono text-ink-900">{e.amount.toLocaleString("de-DE")} €</span>}
                      {col.key === "date" && <span className="text-ink-500">{new Date(e.date).toLocaleDateString("de-DE")}</span>}
                      {col.key === "category" && <span className="text-ink-500">{e.category ?? "—"}</span>}
                      {col.key === "projectNumber" &&
                        (e.projectId ? (
                          <Link href={`/arbeit/${e.projectId}`} className="text-brand-700 hover:underline">
                            {e.projectNumber}
                          </Link>
                        ) : (
                          <span className="text-ink-300">—</span>
                        ))}
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
