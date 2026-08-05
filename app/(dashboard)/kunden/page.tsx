import Link from "next/link";
import { Plus, Archive, Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { CustomersView } from "@/components/customers-view";
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

  const [customers, savedListConfig, filterState] = await Promise.all([
    prisma.customer.findMany({
      where: { companyId: company.id, archivedAt: showArchived ? { not: null } : null },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { projects: true, invoices: true } },
      },
    }),
    getListViewConfig("customer"),
    getFilterState("customer"),
  ]);

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
            className="flex items-center gap-1.5 rounded-lg border border-ink-100 text-ink-700 text-sm font-medium px-3 py-2.5 hover:bg-ink-50 transition-colors"
          >
            <Download size={15} />
            CSV
          </a>
          <Link
            href={showArchived ? "/kunden" : "/kunden?archiviert=1"}
            className="flex items-center gap-1.5 rounded-lg border border-ink-100 text-ink-700 text-sm font-medium px-3 py-2.5 hover:bg-ink-50 transition-colors"
          >
            <Archive size={15} />
            {showArchived ? "Aktive anzeigen" : "Archivierte anzeigen"}
          </Link>
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
          initialViewMode={savedListConfig?.viewMode ?? "cards"}
          initialColumns={columns}
          initialFilterState={filterState}
        />
      )}
    </div>
  );
}
