import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CustomerForm } from "@/components/customer-form";
import { getFieldConfig } from "@/lib/actions/field-config";

export default async function KundeBearbeitenPage({ params }: { params: { id: string } }) {
  const [customer, fieldConfig] = await Promise.all([
    prisma.customer.findUnique({ where: { id: params.id } }),
    getFieldConfig("customer"),
  ]);
  if (!customer) notFound();

  return (
    <div className="space-y-6">
      <Link
        href={`/kunden/${customer.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors"
      >
        <ArrowLeft size={16} />
        Zurück zum Kundenprofil
      </Link>

      <h1 className="text-2xl font-semibold text-ink-900">Kunde bearbeiten</h1>

      <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card">
        <CustomerForm customer={customer} fieldConfig={fieldConfig} />
      </div>
    </div>
  );
}
