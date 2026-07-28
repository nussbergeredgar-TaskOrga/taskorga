import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { InquiryForm } from "@/components/inquiry-form";
import { getFieldConfig } from "@/lib/actions/field-config";

export default async function NeueAnfragePage() {
  const company = await getCurrentCompany();
  const [customers, fieldConfig] = await Promise.all([
    prisma.customer.findMany({
      where: { companyId: company.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    getFieldConfig("inquiry"),
  ]);

  return (
    <div className="space-y-6">
      <Link
        href="/anfragen"
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors"
      >
        <ArrowLeft size={16} />
        Zurück zu Anfragen
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Neue Anfrage</h1>
      </div>

      <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card">
        <InquiryForm customers={customers} fieldConfig={fieldConfig} />
      </div>
    </div>
  );
}
