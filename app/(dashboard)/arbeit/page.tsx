import Link from "next/link";
import { Plus, Briefcase, FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { statusColor } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  PLANNED: "Geplant",
  IN_PROGRESS: "In Arbeit",
  DONE: "Abgeschlossen",
  CANCELLED: "Storniert",
};

export default async function ArbeitPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const company = await getCurrentCompany();
  const projects = await prisma.project.findMany({
    where: { companyId: company.id },
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { name: true } },
      _count: { select: { tasks: true } },
    },
  });

  const statusFilter = searchParams.status;
  const displayedProjects = statusFilter ? projects.filter((p) => p.status === statusFilter) : projects;
  const statusFilterLabel = statusFilter ? STATUS_LABELS[statusFilter] : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Arbeit</h1>
          <p className="text-sm text-ink-500 mt-1">
            {projects.length} Auftrag{projects.length !== 1 ? "e" : ""}
          </p>
        </div>
        <Link
          href="/arbeit/neu"
          className="flex items-center gap-1.5 rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2.5 hover:bg-brand-600 transition-colors"
        >
          <Plus size={16} />
          Neuer Auftrag
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-card border border-dashed border-ink-100 bg-surface p-8 space-y-4">
          <p className="text-ink-500 text-sm">
            Noch keine Aufträge. Ein Auftrag entsteht entweder direkt, oder automatisch, sobald ein
            Angebot angenommen wird:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/arbeit/neu"
              className="rounded-card border-l-4 border-l-brand-500 bg-ink-50 hover:bg-ink-100 p-5 shadow-card hover:shadow-cardHover transition-all"
            >
              <Briefcase size={20} className="text-brand-500 mb-2" />
              <h3 className="font-display font-semibold text-ink-900">Auftrag direkt anlegen</h3>
              <p className="text-sm text-ink-500 mt-1">
                Wenn schon klar ist, was zu tun ist — ohne vorheriges Angebot.
              </p>
            </Link>
            <Link
              href="/angebote/neu"
              className="rounded-card border-l-4 border-l-turquoise-500 bg-ink-50 hover:bg-ink-100 p-5 shadow-card hover:shadow-cardHover transition-all"
            >
              <FileText size={20} className="text-turquoise-500 mb-2" />
              <h3 className="font-display font-semibold text-ink-900">Angebot erstellen</h3>
              <p className="text-sm text-ink-500 mt-1">
                Wird daraus ein Auftrag, sobald der Kunde annimmt — oder direkt mit einem
                bestehenden Auftrag verknüpfen.
              </p>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {statusFilterLabel && (
            <div className="flex items-center gap-2 text-sm text-ink-500">
              Gefiltert: <span className="font-medium text-ink-900">{statusFilterLabel}</span>
              <Link href="/arbeit" className="text-brand-700 hover:underline">
                Zurücksetzen
              </Link>
            </div>
          )}
          {displayedProjects.length === 0 ? (
            <div className="rounded-card border border-dashed border-ink-100 bg-surface p-8 text-center">
              <p className="text-ink-500 text-sm">Keine Aufträge mit diesem Filter.</p>
            </div>
          ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedProjects.map((p) => (
            <Link
              key={p.id}
              href={`/arbeit/${p.id}`}
              className={`rounded-card border-l-4 bg-surface p-5 shadow-card hover:shadow-cardHover transition-shadow ${statusColor[p.status]}`}
            >
              <h3 className="font-display font-semibold text-ink-900">{p.title}</h3>
              <p className="text-sm text-ink-500 mt-0.5">{p.customer.name} · {p.number}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs font-mono text-ink-500">{p._count.tasks} Aufgaben</span>
                <span className="text-xs font-medium text-ink-700">{STATUS_LABELS[p.status]}</span>
              </div>
            </Link>
          ))}
        </div>
          )}
        </>
      )}
    </div>
  );
}
