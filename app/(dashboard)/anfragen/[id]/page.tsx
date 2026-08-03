import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { InquiryStatusActions } from "@/components/inquiry-status-actions";
import { InquiryWorkflow } from "@/components/inquiry-workflow";
import { InquiryAmount } from "@/components/inquiry-amount";
import { DeleteInquiryButton } from "@/components/delete-inquiry-button";

export default async function AnfrageDetailPage({ params }: { params: { id: string } }) {
  const company = await getCurrentCompany();

  const [inquiry, steps] = await Promise.all([
    prisma.inquiry.findFirst({
      where: { id: params.id, companyId: company.id },
      include: { customer: true, quotes: true, stepEntries: true },
    }),
    prisma.workflowStep.findMany({
      where: { companyId: company.id },
      orderBy: { order: "asc" },
    }),
  ]);

  if (!inquiry) notFound();

  const completedStepIds = new Set(
    inquiry.stepEntries.filter((e) => e.completedAt).map((e) => e.stepId)
  );
  const allStepsCompleted = steps.length > 0 && steps.every((s) => completedStepIds.has(s.id));

  return (
    <div className="space-y-6">
      <Link href="/anfragen" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors">
        <ArrowLeft size={16} /> Zurück zu Anfragen
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">{inquiry.title}</h1>
          <p className="text-sm text-ink-500 mt-1">
            <Link href={`/kunden/${inquiry.customer.id}`} className="hover:underline">
              {inquiry.customer.name}
            </Link>
            {inquiry.source && ` · Quelle: ${inquiry.source}`}
          </p>
          <div className="mt-2">
            <InquiryAmount inquiryId={inquiry.id} amount={inquiry.amount != null ? Number(inquiry.amount) : null} />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/anfragen/${inquiry.id}/bearbeiten`}
            className="flex items-center gap-1.5 rounded-lg border border-ink-100 text-ink-700 text-sm font-medium px-3 py-2 hover:bg-ink-50 transition-colors"
          >
            <Pencil size={15} />
            Bearbeiten
          </Link>
          {inquiry.quotes.length === 0 && <DeleteInquiryButton inquiryId={inquiry.id} />}
        </div>
      </div>

      <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card space-y-4">
        <InquiryStatusActions
          inquiryId={inquiry.id}
          status={inquiry.status}
          allStepsCompleted={allStepsCompleted}
          totalSteps={steps.length}
          lostReason={inquiry.lostReason}
        />
        {inquiry.status !== "LOST" && inquiry.quotes.length === 0 && (
          <Link
            href={`/angebote/neu?customerId=${inquiry.customer.id}&inquiryId=${inquiry.id}&title=${encodeURIComponent(inquiry.title)}`}
            className="inline-block rounded-lg border border-brand-500 text-brand-700 px-3 py-2 text-sm font-medium hover:bg-brand-50 transition-colors"
          >
            Angebot erstellen
          </Link>
        )}
      </div>

      <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card">
        <h2 className="font-display font-semibold text-ink-900 mb-5">Ablauf</h2>
        <InquiryWorkflow inquiryId={inquiry.id} steps={steps} entries={inquiry.stepEntries} />
      </div>

      {inquiry.description && (
        <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card">
          <h2 className="font-display font-semibold text-ink-900 mb-2">Beschreibung</h2>
          <p className="text-sm text-ink-700">{inquiry.description}</p>
        </div>
      )}

      {inquiry.quotes.length > 0 && (
        <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card">
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
