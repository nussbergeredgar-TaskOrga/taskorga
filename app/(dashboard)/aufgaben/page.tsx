import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { getLinkablesForCompany } from "@/lib/task-linkables";
import { getCompanyUsers } from "@/lib/actions/free-tasks";
import { getFieldConfig } from "@/lib/actions/field-config";
import { TasksListView } from "@/components/tasks-list-view";

export default async function AufgabenPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const company = await getCurrentCompany();

  const [tasks, users, customers, linkables, fieldConfig] = await Promise.all([
    prisma.task.findMany({
      where: { companyId: company.id },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      include: { assignee: { select: { name: true } }, customer: { select: { name: true } } },
    }),
    getCompanyUsers(),
    prisma.customer.findMany({
      where: { companyId: company.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    getLinkablesForCompany(company.id),
    getFieldConfig("task"),
  ]);

  const openCount = tasks.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Aufgaben</h1>
        <p className="text-sm text-ink-500 mt-1">
          {openCount} offene Aufgabe{openCount !== 1 ? "n" : ""} von {tasks.length} insgesamt
        </p>
      </div>

      <TasksListView
        tasks={tasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate,
          assigneeName: t.assignee?.name ?? null,
          customerName: t.customer?.name ?? null,
        }))}
        users={users}
        customers={customers}
        linkables={linkables}
        fieldConfig={fieldConfig}
        initialStatusFilter={searchParams.status === "open" ? "OPEN_ALL" : ""}
      />
    </div>
  );
}
