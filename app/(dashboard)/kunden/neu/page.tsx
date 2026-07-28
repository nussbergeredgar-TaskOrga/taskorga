import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CustomerForm } from "@/components/customer-form";
import { getFieldConfig } from "@/lib/actions/field-config";

export default async function NeuerKundePage() {
  const fieldConfig = await getFieldConfig("customer");

  return (
    <div className="space-y-6">
      <Link
        href="/kunden"
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors"
      >
        <ArrowLeft size={16} />
        Zurück zu Kunden
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Neuer Kunde</h1>
      </div>

      <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card">
        <CustomerForm fieldConfig={fieldConfig} />
      </div>
    </div>
  );
}
