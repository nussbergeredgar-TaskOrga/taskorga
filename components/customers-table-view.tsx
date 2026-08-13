"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Building2, User as UserIcon } from "lucide-react";
import { ColumnConfigMenu } from "@/components/column-config-menu";
import { EditableCell } from "@/components/editable-cell";
import { MobileListRow } from "@/components/mobile-list-row";
import { saveListViewConfig, type ColumnConfig } from "@/lib/actions/list-view";
import { updateCustomerField } from "@/lib/actions/customers";
import { CUSTOMER_COLUMN_LABELS, type CustomerColumnKey } from "@/lib/customer-columns";

type CustomerRow = {
  id: string;
  name: string;
  type: "PRIVATE" | "BUSINESS";
  email: string | null;
  phone: string | null;
  address: string | null;
  zip: string | null;
  city: string | null;
  customerSince: string; // ISO
  projectsCount: number;
  invoicesCount: number;
};

const TYPE_OPTIONS = [
  { value: "PRIVATE", label: "Privat" },
  { value: "BUSINESS", label: "Geschäft" },
];

const MIN_WIDTH = 70;

function mobileFieldValue(col: ColumnConfig, c: CustomerRow): string {
  switch (col.key) {
    case "type":
      return TYPE_OPTIONS.find((o) => o.value === c.type)?.label ?? c.type;
    case "email":
      return c.email ?? "";
    case "phone":
      return c.phone ?? "";
    case "address":
      return c.address ?? "";
    case "zip":
      return c.zip ?? "";
    case "city":
      return c.city ?? "";
    case "customerSince":
      return new Date(c.customerSince).toLocaleDateString("de-DE");
    case "projectsCount":
      return String(c.projectsCount);
    case "invoicesCount":
      return String(c.invoicesCount);
    default:
      return "";
  }
}

export function CustomersTableView({
  customers,
  initialConfig,
}: {
  customers: CustomerRow[];
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
      saveListViewConfig("customer", { viewMode: "table", columns: columnsRef.current });
    }, 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [columns]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveListViewConfig("customer", { viewMode: "table", columns: columnsRef.current });
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
        <ColumnConfigMenu columns={columns} labels={CUSTOMER_COLUMN_LABELS} onChange={setColumns} />
      </div>

      {customers.length === 0 ? (
        <div className="rounded-card border border-dashed border-ink-100 bg-surface p-8 text-center">
          <p className="text-ink-500 text-sm">Keine Kunden mit diesen Filtern.</p>
        </div>
      ) : (
        <>
        <div className="hidden rounded-card border border-ink-100 bg-surface shadow-card overflow-x-auto sm:block">
          <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
            <thead>
              <tr className="border-b border-ink-100">
                <th className="text-left font-medium text-ink-500 px-3 py-2.5" style={{ width: 220 }}>
                  Name
                </th>
                {visibleColumns.map((c) => (
                  <th
                    key={c.key}
                    className="relative text-left font-medium text-ink-500 px-3 py-2.5"
                    style={{ width: c.width }}
                  >
                    {CUSTOMER_COLUMN_LABELS[c.key as CustomerColumnKey] ?? c.key}
                    <div
                      onMouseDown={(e) => startResize(e, c.key, c.width)}
                      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-brand-500/40"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/50 transition-colors">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {c.type === "BUSINESS" ? (
                        <Building2 size={14} className="text-ink-300 shrink-0" />
                      ) : (
                        <UserIcon size={14} className="text-ink-300 shrink-0" />
                      )}
                      <Link href={`/kunden/${c.id}`} className="font-medium text-ink-900 hover:underline truncate">
                        {c.name}
                      </Link>
                    </div>
                  </td>
                  {visibleColumns.map((col) => (
                    <td key={col.key} className="px-3 py-2 truncate">
                      {col.key === "type" && (
                        <EditableCell recordId={c.id} field="type" value={c.type} type="select" options={TYPE_OPTIONS} onSave={updateCustomerField} />
                      )}
                      {col.key === "email" && <EditableCell recordId={c.id} field="email" value={c.email ?? ""} onSave={updateCustomerField} />}
                      {col.key === "phone" && <EditableCell recordId={c.id} field="phone" value={c.phone ?? ""} onSave={updateCustomerField} />}
                      {col.key === "address" && <EditableCell recordId={c.id} field="address" value={c.address ?? ""} onSave={updateCustomerField} />}
                      {col.key === "zip" && <EditableCell recordId={c.id} field="zip" value={c.zip ?? ""} onSave={updateCustomerField} />}
                      {col.key === "city" && <EditableCell recordId={c.id} field="city" value={c.city ?? ""} onSave={updateCustomerField} />}
                      {col.key === "customerSince" && (
                        <span className="text-ink-500">{new Date(c.customerSince).toLocaleDateString("de-DE")}</span>
                      )}
                      {col.key === "projectsCount" && <span className="font-mono text-ink-500">{c.projectsCount}</span>}
                      {col.key === "invoicesCount" && <span className="font-mono text-ink-500">{c.invoicesCount}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-card border border-ink-100 bg-surface shadow-card sm:hidden">
          {customers.map((c) => (
            <MobileListRow
              key={c.id}
              href={`/kunden/${c.id}`}
              title={c.name}
              icon={
                c.type === "BUSINESS" ? (
                  <Building2 size={14} className="shrink-0 text-ink-300" />
                ) : (
                  <UserIcon size={14} className="shrink-0 text-ink-300" />
                )
              }
              fields={visibleColumns.map((col) => ({
                label: CUSTOMER_COLUMN_LABELS[col.key as CustomerColumnKey] ?? col.key,
                value: mobileFieldValue(col, c),
              }))}
            />
          ))}
        </div>
        </>
      )}
    </div>
  );
}
