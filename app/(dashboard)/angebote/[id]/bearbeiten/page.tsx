import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { QuoteForm } from "@/components/quote-form";
import { getItemTemplates } from "@/lib/actions/item-templates";
import { getFieldConfig } from "@/lib/actions/field-config";

export default async function AngebotBearbeitenPage({ params }: { params: { id: string } }) {
  const company = await getCurrentCompany();
  const [quote, customers, contacts, inquiries, projects, itemTemplates, fieldConfig] = await Promise.all([
    prisma.quote.findFirst({
      where: { id: params.id, companyId: company.id },
      include: { items: { orderBy: { position: "asc" } } },
    }),
    prisma.customer.findMany({
      where: { companyId: company.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.contact.findMany({
      where: { companyId: company.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, customerId: true },
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
    getFieldConfig("quote"),
  ]);

  if (!quote) notFound();
  if (quote.status !== "DRAFT") {
    return (
      <div className="space-y-6">
        <Link
          href={`/angebote/${quote.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors"
        >
          <ArrowLeft size={16} />
          Zurück zum Angebot
        </Link>
        <div className="rounded-card border border-dashed border-ink-100 bg-surface p-8 text-center">
          <p className="text-ink-500 text-sm">
            Nur Angebote im Entwurf können bearbeitet werden. Erstelle stattdessen eine Kopie als
            neuen Entwurf.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/angebote/${quote.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors"
      >
        <ArrowLeft size={16} />
        Zurück zum Angebot
      </Link>

      <h1 className="text-2xl font-semibold text-ink-900">Angebot {quote.number} bearbeiten</h1>

      <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card">
        <QuoteForm
          customers={customers}
          contacts={contacts}
          inquiries={inquiries}
          projects={projects}
          itemTemplates={itemTemplates.map((t) => ({
            id: t.id,
            description: t.description,
            unit: t.unit,
            unitPrice: Number(t.unitPrice),
            taxRate: Number(t.taxRate),
          }))}
          defaultValidUntil={quote.validUntil ? quote.validUntil.toISOString().slice(0, 10) : ""}
          defaultDiscountType={(quote.discountType as "AMOUNT" | "PERCENT") ?? "AMOUNT"}
          defaultCustomerId={quote.customerId}
          defaultContactId={quote.contactId ?? undefined}
          defaultInquiryId={quote.inquiryId ?? undefined}
          defaultTitle={quote.title}
          fieldConfig={fieldConfig}
          editQuoteId={quote.id}
          initialItems={quote.items.map((i) => ({
            description: i.description,
            quantity: String(i.quantity),
            unit: i.unit,
            unitPrice: String(i.unitPrice),
            taxRate: String(i.taxRate),
          }))}
          initialDiscountValue={quote.discountValue != null ? String(quote.discountValue) : ""}
        />
      </div>
    </div>
  );
}
