import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { getLinkablesForCompany } from "@/lib/task-linkables";
import { getCompanyUsers } from "@/lib/actions/free-tasks";
import { getFieldConfig } from "@/lib/actions/field-config";
import { TaskForm } from "@/components/task-form";
import { TaskDeleteButton } from "@/components/task-delete-button";

const LINK_ROUTES: Record<string, (id: string) => string> = {
  inquiryId: (id) => `/anfragen/${id}`,
  quoteId: (id) => `/angebote/${id}`,
  projectId: (id) => `/arbeit/${id}`,
  invoiceId: (id) => `/finanzen/${id}`,
  appointmentId: (id) => `/termine/${id}`,
};

const LINK_LABELS: Record<string, string> = {
  inquiryId: "Zur Anfrage",
  quoteId: "Zum Angebot",
  projectId: "Zum Auftrag",
  invoiceId: "Zur Rechnung",
  appointmentId: "Zum Termin",
};

export default async function AufgabeDetailPage({ params }: { params: { id: string } }) {
  const company = await getCurrentCompany();
  const [task, users, customers, linkables, fieldConfig] = await Promise.all([
    prisma.task.findFirst({ where: { id: params.id, companyId: company.id } }),
    getCompanyUsers(),
    prisma.customer.findMany({
      where: { companyId: company.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    getLinkablesForCompany(company.id),
    getFieldConfig("task"),
  ]);
  if (!task) notFound();

  const linkType = (["inquiryId", "quoteId", "projectId", "invoiceId", "appointmentId"] as const).find(
    (key) => (task as any)[key]
  );
  const linkId = linkType ? (task as any)[linkType] : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/aufgaben" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors">
          <ArrowLeft size={16} /> Zurück zu Aufgaben
        </Link>
        <TaskDeleteButton taskId={task.id} />
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-ink-900">{task.title}</h1>
        {linkType && linkId && (
          <Link
            href={LINK_ROUTES[linkType](linkId)}
            className="inline-flex items-center gap-1.5 text-sm text-brand-700 hover:underline mt-1"
          >
            <ExternalLink size={14} />
            {LINK_LABELS[linkType]}
          </Link>
        )}
      </div>

      <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card max-w-xl">
        <TaskForm
          taskId={task.id}
          initial={{
            title: task.title,
            description: task.description,
            dueDate: task.dueDate,
            priority: task.priority,
            assigneeId: task.assigneeId,
            customerId: task.customerId,
            linkType: linkType as any,
            linkId,
          }}
          users={users}
          customers={customers}
          linkables={linkables}
          fieldConfig={fieldConfig}
        />
      </div>
    </div>
  );
}
