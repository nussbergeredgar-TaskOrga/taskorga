import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { QuoteForm } from "@/components/quote-form";

export default async function NeuesAngebotPage({
  searchParams,
}: {
  searchParams: { customerId?: string; inquiryId?: string; title?: string };
}) {
  const company = await getCurrentCompany();
  const [customers, inquiries, projects] = await Promise.all([
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
  ]);

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
          defaultCustomerId={searchParams.customerId}
          defaultInquiryId={searchParams.inquiryId}
          defaultTitle={searchParams.title}
        />
      </div>
    </div>
  );
}
