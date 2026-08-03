import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { InquiryForm } from "@/components/inquiry-form";
import { getFieldConfig } from "@/lib/actions/field-config";

export default async function AnfrageBearbeitenPage({ params }: { params: { id: string } }) {
  const company = await getCurrentCompany();
  const [inquiry, customers, fieldConfig] = await Promise.all([
    prisma.inquiry.findFirst({ where: { id: params.id, companyId: company.id } }),
    prisma.customer.findMany({
      where: { companyId: company.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    getFieldConfig("inquiry"),
  ]);

  if (!inquiry) notFound();

  return (
    <div className="space-y-6">
      <Link
        href={`/anfragen/${inquiry.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors"
      >
        <ArrowLeft size={16} />
        Zurück zur Anfrage
      </Link>

      <h1 className="text-2xl font-semibold text-ink-900">Anfrage bearbeiten</h1>

      <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card">
        <InquiryForm
          customers={customers}
          fieldConfig={fieldConfig}
          editInquiryId={inquiry.id}
          defaultCustomerId={inquiry.customerId}
          defaultTitle={inquiry.title}
          defaultAmount={inquiry.amount != null ? String(inquiry.amount) : ""}
          defaultSource={inquiry.source ?? ""}
          defaultDescription={inquiry.description ?? ""}
        />
      </div>
    </div>
  );
}
