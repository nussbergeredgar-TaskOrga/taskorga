import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { AnfrageRow } from "@/components/anfrage-row";

export default async function AnfragenPage() {
  const company = await getCurrentCompany();

  const [steps, inquiries, wonInquiries, lostInquiries] = await Promise.all([
    prisma.workflowStep.findMany({
      where: { companyId: company.id },
      orderBy: { order: "asc" },
    }),
    prisma.inquiry.findMany({
      where: { companyId: company.id, status: { notIn: ["WON", "LOST"] } },
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { id: true, name: true } },
        stepEntries: true,
      },
    }),
    prisma.inquiry.findMany({
      where: { companyId: company.id, status: "WON" },
      orderBy: { updatedAt: "desc" },
      include: { customer: { select: { id: true, name: true } } },
      take: 20,
    }),
    prisma.inquiry.findMany({
      where: { companyId: company.id, status: "LOST" },
      orderBy: { updatedAt: "desc" },
      include: { customer: { select: { id: true, name: true } } },
      take: 20,
    }),
  ]);

  // Für jede offene Anfrage den ersten noch nicht abgehakten Schritt ermitteln
  // und die Anfrage dort einsortieren. Sind alle Schritte erledigt, landet sie
  // im Sammelblock "Alle Schritte erledigt".
  const groups = steps.map((step) => ({
    step,
    items: [] as typeof inquiries,
  }));
  const doneGroup: typeof inquiries = [];

  for (const inquiry of inquiries) {
    const completedStepIds = new Set(
      inquiry.stepEntries.filter((e) => e.completedAt).map((e) => e.stepId)
    );
    const pendingStep = steps.find((s) => !completedStepIds.has(s.id));
    if (pendingStep) {
      groups.find((g) => g.step.id === pendingStep.id)!.items.push(inquiry);
    } else {
      doneGroup.push(inquiry);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Anfragen</h1>
          <p className="text-sm text-ink-500 mt-1">
            {inquiries.length} offene Anfrage{inquiries.length !== 1 ? "n" : ""}
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

      {steps.length === 0 ? (
        <div className="rounded-card border border-dashed border-ink-100 bg-white p-8 text-center text-sm text-ink-500">
          Noch keine Workflow-Schritte konfiguriert. Unter{" "}
          <Link href="/einstellungen" className="text-brand-700 hover:underline">
            Einstellungen
          </Link>{" "}
          einrichten.
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(({ step, items }) => (
            <div key={step.id} className="rounded-card border border-ink-100 bg-white p-5 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display font-semibold text-ink-900">{step.label}</h2>
                <span className="text-xs font-mono text-ink-300">{items.length}</span>
              </div>
              {items.length === 0 ? (
                <p className="text-sm text-ink-300">Keine Anfragen in diesem Schritt.</p>
              ) : (
                <div className="space-y-2">
                  {items.map((inquiry) => (
                    <AnfrageRow
                      key={inquiry.id}
                      inquiryId={inquiry.id}
                      stepId={step.id}
                      title={inquiry.title}
                      customerName={inquiry.customer.name}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="rounded-card border border-ink-100 bg-white p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold text-ink-900">Alle Schritte erledigt</h2>
              <span className="text-xs font-mono text-ink-300">{doneGroup.length}</span>
            </div>
            {doneGroup.length === 0 ? (
              <p className="text-sm text-ink-300">Keine Anfragen.</p>
            ) : (
              <div className="space-y-2">
                {doneGroup.map((inquiry) => (
                  <AnfrageRow
                    key={inquiry.id}
                    inquiryId={inquiry.id}
                    stepId={null}
                    title={inquiry.title}
                    customerName={inquiry.customer.name}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-card border border-ink-100 bg-white p-5 shadow-card">
          <h2 className="font-display font-semibold text-success mb-3">Gewonnen</h2>
          {wonInquiries.length === 0 ? (
            <p className="text-sm text-ink-300">Keine.</p>
          ) : (
            <div className="space-y-2">
              {wonInquiries.map((inquiry) => (
                <Link
                  key={inquiry.id}
                  href={`/anfragen/${inquiry.id}`}
                  className="block rounded-lg bg-ink-50 px-3 py-2 text-sm hover:bg-ink-100 transition-colors"
                >
                  {inquiry.title} <span className="text-ink-500">· {inquiry.customer.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-card border border-ink-100 bg-white p-5 shadow-card">
          <h2 className="font-display font-semibold text-danger mb-3">Verloren</h2>
          {lostInquiries.length === 0 ? (
            <p className="text-sm text-ink-300">Keine.</p>
          ) : (
            <div className="space-y-2">
              {lostInquiries.map((inquiry) => (
                <Link
                  key={inquiry.id}
                  href={`/anfragen/${inquiry.id}`}
                  className="block rounded-lg bg-ink-50 px-3 py-2 text-sm hover:bg-ink-100 transition-colors"
                >
                  {inquiry.title} <span className="text-ink-500">· {inquiry.customer.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
