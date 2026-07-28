import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { QuoteForm } from "@/components/quote-form";
import { getItemTemplates } from "@/lib/actions/item-templates";

export default async function NeuesAngebotPage({
  searchParams,
}: {
  searchParams: { customerId?: string; inquiryId?: string; title?: string };
}) {
  const company = await getCurrentCompany();
  const [customers, inquiries, projects, itemTemplates] = await Promise.all([
    prisma.customer.findMany({
      where: { companyId: company.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.inquiry.findMany({
      where: { companyId: company.id, status: { not: "LOST" } },
      select: { id: true, title: true, customerId: true },
    }),
    prisma.project.findMany({
      where: { companyId: company.id, quoteId: null },
      select: { id: true, title: true, number: true, customerId: true },
    }),
    getItemTemplates(),
  ]);

  const defaultValidUntilDate = new Date();
  defaultValidUntilDate.setDate(defaultValidUntilDate.getDate() + company.defaultQuoteValidityDays);
  const defaultValidUntil = defaultValidUntilDate.toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <Link
        href="/angebote"
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors"
      >
        <ArrowLeft size={16} />
        Zurück zu Angeboten
      </Link>

      <h1 className="text-2xl font-semibold text-ink-900">Neues Angebot</h1>

      <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card">
        <QuoteForm
          customers={customers}
          inquiries={inquiries}
          projects={projects}
          itemTemplates={itemTemplates.map((t) => ({
            id: t.id,
            description: t.description,
            unit: t.unit,
            unitPrice: Number(t.unitPrice),
            taxRate: Number(t.taxRate),
          }))}
          defaultValidUntil={defaultValidUntil}
          defaultDiscountType={company.defaultDiscountType as "AMOUNT" | "PERCENT"}
          defaultCustomerId={searchParams.customerId}
          defaultInquiryId={searchParams.inquiryId}
          defaultTitle={searchParams.title}
        />
      </div>
    </div>
  );
}
