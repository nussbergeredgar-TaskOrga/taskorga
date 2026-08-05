import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { getLinkablesForCompany } from "@/lib/task-linkables";
import { getCompanyUsers } from "@/lib/actions/free-tasks";
import { getFieldConfig } from "@/lib/actions/field-config";
import { getListViewConfig } from "@/lib/actions/list-view";
import { getFilterState } from "@/lib/actions/filters";
import { TASK_COLUMNS_DEFAULT } from "@/lib/task-columns";
import { TasksListView } from "@/components/tasks-list-view";

export default async function AufgabenPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const company = await getCurrentCompany();

  const [tasks, users, customers, linkables, fieldConfig, savedListConfig, filterState] = await Promise.all([
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
    getListViewConfig("task"),
    getFilterState("task"),
  ]);

  const savedColumns = savedListConfig?.columns ?? [];
  const savedColumnKeys = new Set(savedColumns.map((c) => c.key));
  const missingColumns = TASK_COLUMNS_DEFAULT.filter((c) => !savedColumnKeys.has(c.key));
  const taskColumns = [...savedColumns, ...missingColumns];

  const openCount = tasks.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS").length;
  const statusFilter = searchParams.status;
  const displayedTasks = statusFilter === "open" ? tasks.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS") : tasks;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Aufgaben</h1>
        <p className="text-sm text-ink-500 mt-1">
          {openCount} offene Aufgabe{openCount !== 1 ? "n" : ""} von {tasks.length} insgesamt
        </p>
      </div>

      {statusFilter === "open" && (
        <div className="flex items-center gap-2 text-sm text-ink-500">
          Gefiltert: <span className="font-medium text-ink-900">Offen (alle)</span>
          <Link href="/aufgaben" className="text-brand-700 hover:underline">
            Zurücksetzen
          </Link>
        </div>
      )}

      <TasksListView
        tasks={displayedTasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate ? t.dueDate.toISOString() : null,
          assigneeName: t.assignee?.name ?? null,
          customerName: t.customer?.name ?? null,
        }))}
        users={users}
        customers={customers}
        linkables={linkables}
        fieldConfig={fieldConfig}
        initialViewMode={savedListConfig?.viewMode ?? "cards"}
        initialColumns={taskColumns}
        initialFilterState={filterState}
      />
    </div>
  );
}
