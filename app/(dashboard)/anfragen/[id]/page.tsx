import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { InquiryStatusActions } from "@/components/inquiry-status-actions";
import { InquiryWorkflow } from "@/components/inquiry-workflow";

export default async function AnfrageDetailPage({ params }: { params: { id: string } }) {
  const company = await getCurrentCompany();

  const [inquiry, steps] = await Promise.all([
    prisma.inquiry.findUnique({
      where: { id: params.id },
      include: { customer: true, quotes: true, stepEntries: true },
    }),
    prisma.workflowStep.findMany({
      where: { companyId: company.id },
      orderBy: { order: "asc" },
    }),
  ]);

  if (!inquiry) notFound();

  return (
    <div className="space-y-6">
      <Link href="/anfragen" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors">
        <ArrowLeft size={16} /> Zurück zu Anfragen
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-ink-900">{inquiry.title}</h1>
        <p className="text-sm text-ink-500 mt-1">
          <Link href={`/kunden/${inquiry.customer.id}`} className="hover:underline">
            {inquiry.customer.name}
          </Link>
          {inquiry.source && ` · Quelle: ${inquiry.source}`}
        </p>
      </div>

      <div className="rounded-card border border-ink-100 bg-white p-6 shadow-card">
        <InquiryStatusActions
          inquiryId={inquiry.id}
          status={inquiry.status}
          customerId={inquiry.customer.id}
          customerName={inquiry.customer.name}
        />
      </div>

      <div className="rounded-card border border-ink-100 bg-white p-6 shadow-card">
        <h2 className="font-display font-semibold text-ink-900 mb-5">Ablauf</h2>
        <InquiryWorkflow inquiryId={inquiry.id} steps={steps} entries={inquiry.stepEntries} />
      </div>

      {inquiry.description && (
        <div className="rounded-card border border-ink-100 bg-white p-6 shadow-card">
          <h2 className="font-display font-semibold text-ink-900 mb-2">Beschreibung</h2>
          <p className="text-sm text-ink-700">{inquiry.description}</p>
        </div>
      )}

      {inquiry.quotes.length > 0 && (
        <div className="rounded-card border border-ink-100 bg-white p-6 shadow-card">
          <h2 className="font-display font-semibold text-ink-900 mb-3">Angebote zu dieser Anfrage</h2>
          <ul className="space-y-2">
            {inquiry.quotes.map((q) => (
              <li key={q.id}>
                <Link href={`/angebote/${q.id}`} className="block rounded-lg bg-ink-50 px-3 py-2 text-sm hover:bg-ink-100 transition-colors">
                  {q.number} — {q.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
