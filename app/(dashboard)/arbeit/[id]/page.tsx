import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ProjectActions } from "@/components/project-actions";
import { TaskList } from "@/components/task-list";

export default async function AuftragDetailPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      tasks: { orderBy: { createdAt: "asc" } },
      invoices: { orderBy: { createdAt: "desc" } },
      quote: true,
    },
  });
  if (!project) notFound();

  return (
    <div className="space-y-6">
      <Link href="/arbeit" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors">
        <ArrowLeft size={16} /> Zurück zu Arbeit
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">{project.title}</h1>
          <p className="text-sm text-ink-500 mt-1">
            {project.number} ·{" "}
            <Link href={`/kunden/${project.customer.id}`} className="hover:underline">
              {project.customer.name}
            </Link>
          </p>
        </div>
        <ProjectActions projectId={project.id} status={project.status} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-card border border-ink-100 bg-white p-5 shadow-card">
          <h2 className="font-display font-semibold text-ink-900 mb-3">Aufgaben</h2>
          <TaskList projectId={project.id} tasks={project.tasks} />
        </div>

        <div className="rounded-card border border-ink-100 bg-white p-5 shadow-card">
          <h2 className="font-display font-semibold text-ink-900 mb-3">Rechnungen</h2>
          {project.invoices.length === 0 ? (
            <p className="text-sm text-ink-500">Noch keine Rechnung erstellt.</p>
          ) : (
            <ul className="space-y-2">
              {project.invoices.map((inv) => (
                <li key={inv.id}>
                  <Link
                    href={`/finanzen/${inv.id}`}
                    className="flex justify-between text-sm rounded-lg bg-ink-50 px-3 py-2 hover:bg-ink-100 transition-colors"
                  >
                    <span>{inv.number}</span>
                    <span className="font-mono">{Number(inv.totalGross).toLocaleString("de-DE")} €</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
