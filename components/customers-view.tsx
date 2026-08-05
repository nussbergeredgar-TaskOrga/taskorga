"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { LayoutGrid, Table2, Building2, User as UserIcon } from "lucide-react";
import { CustomersTableView } from "@/components/customers-table-view";
import { FilterSwitcher } from "@/components/filter-switcher";
import { saveListViewConfig, type ColumnConfig } from "@/lib/actions/list-view";
import type { FilterEntityState, FilterFieldDef } from "@/lib/actions/filters";
import { CUSTOMER_COLUMN_LABELS } from "@/lib/customer-columns";
import { cn } from "@/lib/utils";

type CustomerRow = {
  id: string;
  name: string;
  type: "PRIVATE" | "BUSINESS";
  email: string | null;
  phone: string | null;
  address: string | null;
  zip: string | null;
  city: string | null;
  customerSince: string;
  projectsCount: number;
  invoicesCount: number;
};

// Filterung passiert hier statt in der Tabellen-Ansicht, damit sie fuer
// Karten- und Listenansicht gleichermassen gilt (jede Ansicht ist filterbar,
// nicht nur die Liste).
export function CustomersView({
  customers,
  initialViewMode,
  initialColumns,
  initialFilterState,
}: {
  customers: CustomerRow[];
  initialViewMode: "cards" | "table";
  initialColumns: ColumnConfig[];
  initialFilterState: FilterEntityState;
}) {
  const [viewMode, setViewMode] = useState(initialViewMode);
  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState(initialFilterState);
  const [, startTransition] = useTransition();

  function setMode(mode: "cards" | "table") {
    setViewMode(mode);
    startTransition(() => saveListViewConfig("customer", { viewMode: mode, columns: initialColumns }));
  }

  // Filterbar sind alle Detailinformationen hinter dem Datensatz, nicht nur
  // ein paar ausgewaehlte Felder -- pro Feld werden die tatsaechlich
  // vorkommenden Werte als Mehrfachauswahl angeboten.
  const filterFields: FilterFieldDef[] = useMemo(() => {
    function distinctOptions(pick: (c: CustomerRow) => string | number | null, format?: (v: string) => string) {
      const values = Array.from(
        new Set(
          customers
            .map((c) => pick(c))
            .filter((v): v is string | number => v !== null && v !== "")
            .map((v) => String(v))
        )
      ).sort();
      return values.map((v) => ({ value: v, label: format ? format(v) : v }));
    }

    return [
      {
        key: "type",
        label: CUSTOMER_COLUMN_LABELS.type,
        options: [
          { value: "PRIVATE", label: "Privat" },
          { value: "BUSINESS", label: "Geschäft" },
        ],
      },
      { key: "city", label: CUSTOMER_COLUMN_LABELS.city, options: distinctOptions((c) => c.city) },
      { key: "zip", label: CUSTOMER_COLUMN_LABELS.zip, options: distinctOptions((c) => c.zip) },
      { key: "address", label: CUSTOMER_COLUMN_LABELS.address, options: distinctOptions((c) => c.address) },
      { key: "email", label: CUSTOMER_COLUMN_LABELS.email, options: distinctOptions((c) => c.email) },
      { key: "phone", label: CUSTOMER_COLUMN_LABELS.phone, options: distinctOptions((c) => c.phone) },
      {
        key: "customerSince",
        label: CUSTOMER_COLUMN_LABELS.customerSince,
        options: distinctOptions(
          (c) => c.customerSince,
          (v) => new Date(v).toLocaleDateString("de-DE")
        ),
      },
      {
        key: "projectsCount",
        label: CUSTOMER_COLUMN_LABELS.projectsCount,
        options: distinctOptions((c) => c.projectsCount),
      },
      {
        key: "invoicesCount",
        label: CUSTOMER_COLUMN_LABELS.invoicesCount,
        options: distinctOptions((c) => c.invoicesCount),
      },
    ];
  }, [customers]);

  const activeFilter = filterState.filters.find((f) => f.id === filterState.activeFilterId) ?? null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q) && !(c.email ?? "").toLowerCase().includes(q)) return false;
      if (activeFilter) {
        for (const cond of activeFilter.conditions) {
          if (cond.values.length === 0) continue;
          const raw = c[cond.field as keyof CustomerRow];
          const value = raw == null ? "" : String(raw);
          if (!cond.values.includes(value)) return false;
        }
      }
      return true;
    });
  }, [customers, search, activeFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suchen nach Name oder E-Mail …"
            className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 min-w-[200px]"
          />
          <FilterSwitcher entity="customer" fields={filterFields} state={filterState} onStateChange={setFilterState} />
        </div>
        <div className="inline-flex rounded-lg border border-ink-100 overflow-hidden">
          <button
            onClick={() => setMode("cards")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
              viewMode === "cards" ? "bg-brand-500 text-white" : "text-ink-700 hover:bg-ink-50"
            )}
          >
            <LayoutGrid size={14} />
            Karten
          </button>
          <button
            onClick={() => setMode("table")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors border-l border-ink-100",
              viewMode === "table" ? "bg-brand-500 text-white" : "text-ink-700 hover:bg-ink-50"
            )}
          >
            <Table2 size={14} />
            Liste
          </button>
        </div>
      </div>

      {viewMode === "table" ? (
        <CustomersTableView customers={filtered} initialConfig={{ viewMode, columns: initialColumns }} />
      ) : filtered.length === 0 ? (
        <div className="rounded-card border border-dashed border-ink-100 bg-surface p-8 text-center">
          <p className="text-ink-500 text-sm">Keine Kunden mit diesen Filtern.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((customer) => (
            <Link
              key={customer.id}
              href={`/kunden/${customer.id}`}
              className="rounded-card border-l-4 border-l-brand-500 bg-surface p-5 shadow-card hover:shadow-cardHover transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display font-semibold text-ink-900">{customer.name}</h3>
                  <p className="text-sm text-ink-500 mt-0.5">{customer.city || "Ort nicht angegeben"}</p>
                </div>
                {customer.type === "BUSINESS" ? (
                  <Building2 size={18} className="text-ink-300 shrink-0" />
                ) : (
                  <UserIcon size={18} className="text-ink-300 shrink-0" />
                )}
              </div>
              <div className="mt-4 flex gap-4 text-xs text-ink-500 font-mono">
                <span>{customer.projectsCount} Aufträge</span>
                <span>{customer.invoicesCount} Rechnungen</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
