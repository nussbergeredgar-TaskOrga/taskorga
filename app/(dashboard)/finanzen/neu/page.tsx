import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { InvoiceForm } from "@/components/invoice-form";
import { getItemTemplates } from "@/lib/actions/item-templates";
import { getFieldConfig } from "@/lib/actions/field-config";

export default async function NeueRechnungPage({
  searchParams,
}: {
  searchParams: { customerId?: string };
}) {
  const company = await getCurrentCompany();
  const [customers, projects, itemTemplates, fieldConfig] = await Promise.all([
    prisma.customer.findMany({
      where: { companyId: company.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.project.findMany({
      where: { companyId: company.id },
      select: { id: true, title: true, number: true, customerId: true },
    }),
    getItemTemplates(),
    getFieldConfig("invoice"),
  ]);

  return (
    <div className="space-y-6">
      <Link
        href="/finanzen"
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors"
      >
        <ArrowLeft size={16} />
        Zurück zu Finanzen
      </Link>

      <h1 className="text-2xl font-semibold text-ink-900">Neue Rechnung</h1>

      <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card">
        <InvoiceForm
          customers={customers}
          projects={projects}
          itemTemplates={itemTemplates.map((t) => ({
            id: t.id,
            description: t.description,
            unit: t.unit,
            unitPrice: Number(t.unitPrice),
            taxRate: Number(t.taxRate),
          }))}
          defaultDiscountType={company.defaultDiscountType as "AMOUNT" | "PERCENT"}
          defaultCustomerId={searchParams.customerId}
          fieldConfig={fieldConfig}
        />
      </div>
    </div>
  );
}
