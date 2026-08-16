import Link from "next/link";
import { Plus, Archive, Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { CustomersView } from "@/components/customers-view";
import { ListHeaderActions } from "@/components/list-header-actions";
import { getListViewConfig } from "@/lib/actions/list-view";
import { getFilterState } from "@/lib/actions/filters";
import { CUSTOMER_COLUMNS_DEFAULT } from "@/lib/customer-columns";

export default async function KundenPage({
  searchParams,
}: {
  searchParams: { archiviert?: string };
}) {
  const company = await getCurrentCompany();
  const showArchived = searchParams.archiviert === "1";

  const [customers, contacts, savedListConfig, filterState] = await Promise.all([
    prisma.customer.findMany({
      where: { companyId: company.id, archivedAt: showArchived ? { not: null } : null },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { projects: true, invoices: true } },
      },
    }),
    // Ansprechpartner haben kein eigenes Archiv -- sie erscheinen nur in der
    // aktiven Ansicht, zusammen mit dem Hinweis, zu welchem Unternehmen sie gehoeren.
    showArchived
      ? Promise.resolve([])
      : prisma.contact.findMany({
          where: { companyId: company.id },
          orderBy: { name: "asc" },
          include: { customer: { select: { id: true, name: true, archivedAt: true } } },
        }),
    getListViewConfig("customer"),
    getFilterState("customer"),
  ]);
  const visibleContacts = contacts.filter((c) => !c.customer.archivedAt);

  // Neue Spalten, die es beim letzten Speichern der Konfiguration noch nicht
  // gab, werden ergaenzt (analog zum Dashboard-Layout) -- sonst wuerden
  // zukuenftig hinzugefuegte Spalten fuer bestehende Nutzer nie auftauchen.
  const savedColumns = savedListConfig?.columns ?? [];
  const savedKeys = new Set(savedColumns.map((c) => c.key));
  const missingColumns = CUSTOMER_COLUMNS_DEFAULT.filter((c) => !savedKeys.has(c.key));
  const columns = [...savedColumns, ...missingColumns];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Kunden</h1>
          <p className="text-sm text-ink-500 mt-1">
            {customers.length} {showArchived ? "archivierte " : ""}Kunde{customers.length !== 1 ? "n" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/kunden/export${showArchived ? "?archiviert=1" : ""}`}
            className="hidden items-center gap-1.5 rounded-lg border border-ink-100 text-ink-700 text-sm font-medium px-3 py-2.5 hover:bg-ink-50 transition-colors sm:flex"
          >
            <Download size={15} />
            CSV
          </a>
          <Link
            href={showArchived ? "/kunden" : "/kunden?archiviert=1"}
            className="hidden items-center gap-1.5 rounded-lg border border-ink-100 text-ink-700 text-sm font-medium px-3 py-2.5 hover:bg-ink-50 transition-colors sm:flex"
          >
            <Archive size={15} />
            {showArchived ? "Aktive anzeigen" : "Archivierte anzeigen"}
          </Link>
          <ListHeaderActions>
            <a
              href={`/api/kunden/export${showArchived ? "?archiviert=1" : ""}`}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-ink-700 hover:bg-ink-50 transition-colors"
            >
              <Download size={14} /> CSV
            </a>
            <Link
              href={showArchived ? "/kunden" : "/kunden?archiviert=1"}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-ink-700 hover:bg-ink-50 transition-colors"
            >
              <Archive size={14} /> {showArchived ? "Aktive anzeigen" : "Archivierte anzeigen"}
            </Link>
          </ListHeaderActions>
          <Link
            href="/kunden/neu"
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2.5 hover:bg-brand-600 transition-colors"
          >
            <Plus size={16} />
            Neuer Kunde
          </Link>
        </div>
      </div>

      {customers.length === 0 ? (
        <div className="rounded-card border border-dashed border-ink-100 bg-surface p-12 text-center">
          <p className="text-ink-500 text-sm">
            Noch keine Kunden vorhanden. Lege den ersten Kunden an, um loszulegen.
          </p>
        </div>
      ) : (
        <CustomersView
          customers={customers.map((c) => ({
            id: c.id,
            name: c.name,
            number: c.number,
            type: c.type,
            email: c.email,
            phone: c.phone,
            address: c.address,
            zip: c.zip,
            city: c.city,
            customerSince: c.customerSince.toISOString(),
            projectsCount: c._count.projects,
            invoicesCount: c._count.invoices,
          }))}
          contacts={visibleContacts.map((c) => ({
            id: c.id,
            name: c.name,
            number: c.number,
            role: c.role,
            email: c.email,
            phone: c.phone,
            parentCustomerId: c.customer.id,
            parentCustomerName: c.customer.name,
          }))}
          initialViewMode={savedListConfig?.viewMode ?? "cards"}
          initialColumns={columns}
          initialFilterState={filterState}
        />
      )}
    </div>
  );
}
