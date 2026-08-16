"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { LayoutGrid, Table2, Building2, User as UserIcon, UserRound, ChevronDown } from "lucide-react";
import { CustomersTableView } from "@/components/customers-table-view";
import { FilterSwitcher } from "@/components/filter-switcher";
import { saveListViewConfig, type ColumnConfig } from "@/lib/actions/list-view";
import type { FilterEntityState, FilterFieldDef } from "@/lib/actions/filters";
import { CUSTOMER_COLUMN_LABELS } from "@/lib/customer-columns";
import { cn } from "@/lib/utils";

function ContactCard({ contact }: { contact: ContactRow }) {
  return (
    <Link
      href={`/kunden/${contact.parentCustomerId}`}
      className="block rounded-card border-l-4 border-l-ink-300 bg-surface p-5 shadow-card hover:shadow-cardHover transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <h3 className="truncate font-display font-semibold text-ink-900">{contact.name}</h3>
          <p className="text-sm text-ink-500 mt-0.5 truncate">
            Ansprechpartner bei {contact.parentCustomerName}
            {contact.role ? ` · ${contact.role}` : ""}
          </p>
        </div>
        <UserRound size={18} className="text-ink-300 shrink-0" />
      </div>
      {(contact.email || contact.phone) && (
        <p className="mt-4 text-xs text-ink-500 truncate">
          {[contact.email, contact.phone].filter(Boolean).join(" · ")}
        </p>
      )}
    </Link>
  );
}

function CustomerCard({ customer }: { customer: CustomerRow }) {
  const [expanded, setExpanded] = useState(false);
  const details = [
    customer.phone && { label: "Telefon", value: customer.phone },
    customer.address &&
      { label: "Adresse", value: [customer.address, [customer.zip, customer.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") },
    customer.email && { label: "E-Mail", value: customer.email },
    { label: "Kunde seit", value: new Date(customer.customerSince).toLocaleDateString("de-DE") },
  ].filter((d): d is { label: string; value: string } => !!d);

  return (
    <div className="rounded-card border-l-4 border-l-brand-500 bg-surface shadow-card">
      {/* Desktop: unveraendert */}
      <Link
        href={`/kunden/${customer.id}`}
        className="hidden p-5 hover:shadow-cardHover transition-shadow sm:block"
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
        <div className="mt-4 flex items-center gap-4 text-xs text-ink-500 font-mono">
          {customer.number && <span className="rounded-full bg-ink-50 px-2 py-0.5">{customer.number}</span>}
          <span>{customer.projectsCount} Aufträge</span>
          <span>{customer.invoicesCount} Rechnungen</span>
        </div>
      </Link>

      {/* Mobile: Details per Chevron ausklappbar statt nebeneinander */}
      <div className="sm:hidden">
        <div className="flex items-start gap-2 p-4">
          <Link href={`/kunden/${customer.id}`} className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate font-display font-semibold text-ink-900">{customer.name}</h3>
                <p className="text-sm text-ink-500 mt-0.5">{customer.city || "Ort nicht angegeben"}</p>
              </div>
              {customer.type === "BUSINESS" ? (
                <Building2 size={18} className="shrink-0 text-ink-300" />
              ) : (
                <UserIcon size={18} className="shrink-0 text-ink-300" />
              )}
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-ink-500 font-mono">
              {customer.number && <span className="rounded-full bg-ink-50 px-2 py-0.5">{customer.number}</span>}
              <span>{customer.projectsCount} Aufträge</span>
              <span>{customer.invoicesCount} Rechnungen</span>
            </div>
          </Link>
          {details.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="shrink-0 p-1 text-ink-300 hover:text-ink-700 transition-colors"
              aria-label={expanded ? "Details einklappen" : "Details anzeigen"}
            >
              <ChevronDown size={16} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
          )}
        </div>
        {expanded && details.length > 0 && (
          <div className="space-y-1 border-t border-ink-100 px-4 py-3">
            {details.map((d) => (
              <p key={d.label} className="text-xs text-ink-500">
                <span className="text-ink-300">{d.label}:</span> {d.value}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type CustomerRow = {
  id: string;
  name: string;
  number: string | null;
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

export type ContactRow = {
  id: string;
  name: string;
  number: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  parentCustomerId: string;
  parentCustomerName: string;
};

// Filterung passiert hier statt in der Tabellen-Ansicht, damit sie fuer
// Karten- und Listenansicht gleichermassen gilt (jede Ansicht ist filterbar,
// nicht nur die Liste).
export function CustomersView({
  customers,
  contacts,
  initialViewMode,
  initialColumns,
  initialFilterState,
}: {
  customers: CustomerRow[];
  contacts?: ContactRow[];
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

  // Ansprechpartner laufen nur zusaetzlich mit durch die Liste -- die
  // erweiterten Spalten-Filter (Ort, PLZ, Auftraege …) gelten nur fuer
  // Kunden, da Kontakte diese Felder nicht haben; die Freitextsuche gilt fuer
  // beide gemeinsam, ebenso wird bei aktivem Spalten-Filter nichts angezeigt,
  // das nicht zu einem Kunden gehoert (sonst wirkt der Filter inkonsistent).
  const filteredContacts = useMemo(() => {
    if (!contacts || activeFilter) return [];
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        c.parentCustomerName.toLowerCase().includes(q)
    );
  }, [contacts, search, activeFilter]);

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
        <CustomersTableView customers={filtered} contacts={filteredContacts} initialConfig={{ viewMode, columns: initialColumns }} />
      ) : filtered.length === 0 && filteredContacts.length === 0 ? (
        <div className="rounded-card border border-dashed border-ink-100 bg-surface p-8 text-center">
          <p className="text-ink-500 text-sm">Keine Kunden mit diesen Filtern.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((customer) => (
            <CustomerCard key={customer.id} customer={customer} />
          ))}
          {filteredContacts.map((contact) => (
            <ContactCard key={contact.id} contact={contact} />
          ))}
        </div>
      )}
    </div>
  );
}
