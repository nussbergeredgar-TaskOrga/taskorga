import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { InquiryBoard } from "@/components/inquiry-board";

export default async function AnfragenPage() {
  const company = await getCurrentCompany();

  const inquiries = await prisma.inquiry.findMany({
    where: { companyId: company.id },
    orderBy: { createdAt: "desc" },
    include: { customer: { select: { id: true, name: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Anfragen</h1>
          <p className="text-sm text-ink-500 mt-1">
            {inquiries.length} Anfrage{inquiries.length !== 1 ? "n" : ""} insgesamt
          </p>
        </div>
        <Link
          href="/anfragen/neu"
          className="flex items-center gap-1.5 rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2.5 hover:bg-brand-600 transition-colors"
        >
          <Plus size={16} />
          Neue Anfrage
        </Link>
      </div>

      {inquiries.length === 0 ? (
        <div className="rounded-card border border-dashed border-ink-100 bg-white p-12 text-center">
          <p className="text-ink-500 text-sm">
            Noch keine Anfragen vorhanden. Lege die erste Anfrage an.
          </p>
        </div>
      ) : (
        <InquiryBoard inquiries={inquiries} />
      )}
    </div>
  );
}
