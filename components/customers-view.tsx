"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { LayoutGrid, Table2, Building2, User as UserIcon } from "lucide-react";
import { CustomersTableView } from "@/components/customers-table-view";
import { saveListViewConfig, type ColumnConfig } from "@/lib/actions/list-view";
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

export function CustomersView({
  customers,
  initialViewMode,
  initialColumns,
}: {
  customers: CustomerRow[];
  initialViewMode: "cards" | "table";
  initialColumns: ColumnConfig[];
}) {
  const [viewMode, setViewMode] = useState(initialViewMode);
  const [, startTransition] = useTransition();

  function setMode(mode: "cards" | "table") {
    setViewMode(mode);
    startTransition(() => saveListViewConfig("customer", { viewMode: mode, columns: initialColumns }));
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
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
        <CustomersTableView customers={customers} initialConfig={{ viewMode, columns: initialColumns }} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((customer) => (
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
