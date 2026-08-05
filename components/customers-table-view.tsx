"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Building2, User as UserIcon } from "lucide-react";
import { ColumnConfigMenu } from "@/components/column-config-menu";
import { FilterBar, type FilterDef } from "@/components/filter-bar";
import { saveListViewConfig, type ColumnConfig } from "@/lib/actions/list-view";
import { updateCustomerField } from "@/lib/actions/customers";
import { CUSTOMER_COLUMN_LABELS, CUSTOMER_EDITABLE_FIELDS, type CustomerColumnKey } from "@/lib/customer-columns";

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

const TYPE_LABEL: Record<string, string> = { PRIVATE: "Privat", BUSINESS: "Geschäft" };
const MIN_WIDTH = 70;

function EditableCell({
  customerId,
  field,
  value,
  type = "text",
}: {
  customerId: string;
  field: CustomerColumnKey | "name";
  value: string;
  type?: "text" | "select";
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setDraft(value), [value]);

  function save() {
    if (draft === value) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const result = await updateCustomerField(customerId, field, draft);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setError("");
      setEditing(false);
    });
  }

  if (type === "select") {
    return (
      <select
        value={value}
        disabled={pending}
        onClick={(e) => e.preventDefault()}
        onChange={(e) => {
          startTransition(async () => {
            await updateCustomerField(customerId, field, e.target.value);
          });
        }}
        className="w-full bg-transparent text-sm outline-none cursor-pointer"
      >
        <option value="PRIVATE">Privat</option>
        <option value="BUSINESS">Geschäft</option>
      </select>
    );
  }

  if (!editing) {
    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          setEditing(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="w-full text-left text-sm text-ink-700 truncate hover:bg-ink-50 rounded px-1 -mx-1 py-0.5 transition-colors"
        title="Zum Bearbeiten klicken"
      >
        {value || <span className="text-ink-300">—</span>}
      </button>
    );
  }

  return (
    <div onClick={(e) => e.preventDefault()}>
      <input
        ref={inputRef}
        value={draft}
        disabled={pending}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className="w-full rounded border border-brand-500 px-1 py-0.5 text-sm outline-none bg-surface"
      />
      {error && <p className="text-[11px] text-danger mt-0.5">{error}</p>}
    </div>
  );
}

export function CustomersTableView({
  customers,
  initialConfig,
}: {
  customers: CustomerRow[];
  initialConfig: { viewMode: "cards" | "table"; columns: ColumnConfig[] };
}) {
  const [columns, setColumns] = useState(initialConfig.columns);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
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

  const filterDefs: FilterDef[] = [
    {
      key: "type",
      label: "Typ",
      type: "select",
      options: [
        { value: "PRIVATE", label: "Privat" },
        { value: "BUSINESS", label: "Geschäft" },
      ],
    },
    { key: "city", label: "Ort", type: "text", placeholder: "Ort" },
  ];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q) && !(c.email ?? "").toLowerCase().includes(q)) return false;
      if (filters.type && c.type !== filters.type) return false;
      if (filters.city && !(c.city ?? "").toLowerCase().includes(filters.city.toLowerCase())) return false;
      return true;
    });
  }, [customers, search, filters]);

  const visibleColumns = [...columns].filter((c) => c.visible).sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suchen nach Name oder E-Mail …"
            className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 min-w-[200px]"
          />
          <FilterBar defs={filterDefs} values={filters} onChange={setFilters} />
        </div>
        <ColumnConfigMenu columns={columns} labels={CUSTOMER_COLUMN_LABELS} onChange={setColumns} />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-card border border-dashed border-ink-100 bg-surface p-8 text-center">
          <p className="text-ink-500 text-sm">Keine Kunden mit diesen Filtern.</p>
        </div>
      ) : (
        <div className="rounded-card border border-ink-100 bg-surface shadow-card overflow-x-auto">
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
              {filtered.map((c) => (
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
                      {col.key === "type" && <EditableCell customerId={c.id} field="type" value={c.type} type="select" />}
                      {col.key === "email" && <EditableCell customerId={c.id} field="email" value={c.email ?? ""} />}
                      {col.key === "phone" && <EditableCell customerId={c.id} field="phone" value={c.phone ?? ""} />}
                      {col.key === "address" && <EditableCell customerId={c.id} field="address" value={c.address ?? ""} />}
                      {col.key === "zip" && <EditableCell customerId={c.id} field="zip" value={c.zip ?? ""} />}
                      {col.key === "city" && <EditableCell customerId={c.id} field="city" value={c.city ?? ""} />}
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
      )}
    </div>
  );
}
