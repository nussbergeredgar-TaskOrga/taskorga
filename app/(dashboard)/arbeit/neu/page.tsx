import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { ProjectQuickForm } from "@/components/project-quick-form";

export default async function NeuerAuftragPage() {
  const company = await getCurrentCompany();
  const customers = await prisma.customer.findMany({
    where: { companyId: company.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6">
      <Link href="/arbeit" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors">
        <ArrowLeft size={16} /> Zurück zu Arbeit
      </Link>

      <h1 className="text-2xl font-semibold text-ink-900">Neuer Auftrag</h1>

      <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card">
        <ProjectQuickForm customers={customers} />
      </div>
    </div>
  );
}
