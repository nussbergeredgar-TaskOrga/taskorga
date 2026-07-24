import Link from "next/link";
import { Plus, Building2, User as UserIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";

export default async function KundenPage() {
  const company = await getCurrentCompany();

  const customers = await prisma.customer.findMany({
    where: { companyId: company.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { projects: true, invoices: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Kunden</h1>
          <p className="text-sm text-ink-500 mt-1">
            {customers.length} Kunde{customers.length !== 1 ? "n" : ""}
          </p>
        </div>
        <Link
          href="/kunden/neu"
          className="flex items-center gap-1.5 rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2.5 hover:bg-brand-600 transition-colors"
        >
          <Plus size={16} />
          Neuer Kunde
        </Link>
      </div>

      {customers.length === 0 ? (
        <div className="rounded-card border border-dashed border-ink-100 bg-white p-12 text-center">
          <p className="text-ink-500 text-sm">
            Noch keine Kunden vorhanden. Lege den ersten Kunden an, um loszulegen.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((customer) => (
            <Link
              key={customer.id}
              href={`/kunden/${customer.id}`}
              className="rounded-card border-l-4 border-l-brand-500 bg-white p-5 shadow-card hover:shadow-cardHover transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display font-semibold text-ink-900">
                    {customer.name}
                  </h3>
                  <p className="text-sm text-ink-500 mt-0.5">
                    {customer.city || "Ort nicht angegeben"}
                  </p>
                </div>
                {customer.type === "BUSINESS" ? (
                  <Building2 size={18} className="text-ink-300 shrink-0" />
                ) : (
                  <UserIcon size={18} className="text-ink-300 shrink-0" />
                )}
              </div>
              <div className="mt-4 flex gap-4 text-xs text-ink-500 font-mono">
                <span>{customer._count.projects} Aufträge</span>
                <span>{customer._count.invoices} Rechnungen</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
