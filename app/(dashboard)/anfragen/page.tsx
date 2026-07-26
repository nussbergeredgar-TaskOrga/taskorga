import Link from "next/link";
import { Plus, Trophy, XCircle, Calendar } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { AnfrageRow } from "@/components/anfrage-row";

export default async function AnfragenPage() {
  const company = await getCurrentCompany();

  const [steps, inquiries, wonAgg, lostAgg, scheduledAppointments] = await Promise.all([
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
    prisma.inquiry.aggregate({
      where: { companyId: company.id, status: "WON" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.inquiry.aggregate({
      where: { companyId: company.id, status: "LOST" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.appointment.findMany({
      where: { companyId: company.id, inquiryId: { not: null } },
      orderBy: { scheduledAt: "asc" },
      include: {
        customer: { select: { id: true, name: true } },
        inquiry: { select: { id: true, title: true } },
      },
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

      {scheduledAppointments.length > 0 && (
        <div className="rounded-card border border-ink-100 bg-surface p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="flex items-center gap-2 font-display font-semibold text-ink-900">
              <Calendar size={16} className="text-turquoise-500" />
              Terminiert
            </h2>
            <span className="text-xs font-mono text-ink-300">{scheduledAppointments.length}</span>
          </div>
          <div className="space-y-2">
            {scheduledAppointments.map((a) => (
              <Link
                key={a.id}
                href={a.inquiry ? `/anfragen/${a.inquiry.id}` : "/termine"}
                className="flex items-center justify-between gap-3 rounded-lg border-l-4 border-l-turquoise-500 bg-ink-50 px-3 py-2.5 text-sm hover:bg-ink-100 transition-colors"
              >
                <div className="min-w-0">
                  <span className="font-medium text-ink-900">{a.inquiry?.title ?? a.title}</span>
                  <span className="text-ink-500 ml-2">{a.customer?.name}</span>
                </div>
                <div className="text-right shrink-0 font-mono text-xs text-ink-500">
                  {a.scheduledAt && a.scheduledAt.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                  {a.scheduledAt && ` ${a.scheduledAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`}
                  {a.amount != null && ` · ${Number(a.amount).toLocaleString("de-DE")} €`}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {steps.length === 0 ? (
        <div className="rounded-card border border-dashed border-ink-100 bg-surface p-8 text-center text-sm text-ink-500">
          Noch keine Workflow-Schritte konfiguriert. Unter{" "}
          <Link href="/einstellungen" className="text-brand-700 hover:underline">
            Einstellungen
          </Link>{" "}
          einrichten.
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(({ step, items }) => {
            const stepTotal = items.reduce((sum, i) => sum + Number(i.amount ?? 0), 0);
            return (
              <div key={step.id} className="rounded-card border border-ink-100 bg-surface p-5 shadow-card">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display font-semibold text-ink-900">{step.label}</h2>
                  <div className="flex items-center gap-3 text-xs">
                    {stepTotal > 0 && (
                      <span className="font-mono text-ink-500">{stepTotal.toLocaleString("de-DE")} €</span>
                    )}
                    <span className="font-mono text-ink-300">{items.length}</span>
                  </div>
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
                        amount={inquiry.amount != null ? Number(inquiry.amount) : null}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="rounded-card border border-ink-100 bg-surface p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold text-ink-900">Alle Schritte erledigt</h2>
              <div className="flex items-center gap-3 text-xs">
                {doneGroup.reduce((sum, i) => sum + Number(i.amount ?? 0), 0) > 0 && (
                  <span className="font-mono text-ink-500">
                    {doneGroup.reduce((sum, i) => sum + Number(i.amount ?? 0), 0).toLocaleString("de-DE")} €
                  </span>
                )}
                <span className="font-mono text-ink-300">{doneGroup.length}</span>
              </div>
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
                    amount={inquiry.amount != null ? Number(inquiry.amount) : null}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          href="/anfragen/gewonnen"
          className="rounded-card border-l-4 border-l-success bg-surface p-5 shadow-card hover:shadow-cardHover transition-shadow block"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-ink-500">Gewonnen ({wonAgg._count})</span>
            <Trophy size={18} className="text-success" />
          </div>
          <p className="mt-2 font-mono text-2xl font-medium text-ink-900">
            {Number(wonAgg._sum.amount ?? 0).toLocaleString("de-DE")} €
          </p>
        </Link>
        <Link
          href="/anfragen/verloren"
          className="rounded-card border-l-4 border-l-danger bg-surface p-5 shadow-card hover:shadow-cardHover transition-shadow block"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-ink-500">Verloren ({lostAgg._count})</span>
            <XCircle size={18} className="text-danger" />
          </div>
          <p className="mt-2 font-mono text-2xl font-medium text-ink-900">
            {Number(lostAgg._sum.amount ?? 0).toLocaleString("de-DE")} €
          </p>
        </Link>
      </div>
    </div>
  );
}
