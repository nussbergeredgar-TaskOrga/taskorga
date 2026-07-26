import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { statusColor } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  PLANNED: "Geplant",
  IN_PROGRESS: "In Arbeit",
  DONE: "Abgeschlossen",
  CANCELLED: "Storniert",
};

export default async function ArbeitPage() {
  const company = await getCurrentCompany();
  const projects = await prisma.project.findMany({
    where: { companyId: company.id },
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { name: true } },
      _count: { select: { tasks: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Arbeit</h1>
        <p className="text-sm text-ink-500 mt-1">
          {projects.length} Auftrag{projects.length !== 1 ? "e" : ""}. Aufträge entstehen automatisch aus angenommenen Angeboten.
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-card border border-dashed border-ink-100 bg-surface p-12 text-center">
          <p className="text-ink-500 text-sm">
            Noch keine Aufträge. Nimm ein Angebot an, um den ersten Auftrag zu erzeugen.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
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
    </div>
  );
}
