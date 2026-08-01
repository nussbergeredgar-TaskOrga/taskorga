import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { RecordNotes } from "@/components/record-notes";
import { RecordTasks } from "@/components/record-tasks";
import { AppointmentStatusSelect } from "@/components/appointment-status-select";
import { AppointmentAssigneeSelect } from "@/components/appointment-assignee-select";

export default async function TerminDetailPage({ params }: { params: { id: string } }) {
  const company = await getCurrentCompany();
  const appointment = await prisma.appointment.findFirst({
    where: { id: params.id, companyId: company.id },
    include: {
      customer: true,
      inquiry: { select: { id: true, title: true } },
      assignee: { select: { id: true, name: true } },
      comments: { orderBy: { createdAt: "desc" }, include: { user: true } },
      tasks: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!appointment) notFound();

  const users = await prisma.user.findMany({
    where: { companyId: company.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const link = { appointmentId: appointment.id };

  return (
    <div className="space-y-6">
      <Link href="/termine" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors">
        <ArrowLeft size={16} /> Zurück zu Termine
      </Link>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">{appointment.title}</h1>
          <p className="text-sm text-ink-500 mt-1">
            {appointment.type}
            {appointment.customer && (
              <>
                {" · "}
                <Link href={`/kunden/${appointment.customer.id}`} className="hover:underline">
                  {appointment.customer.name}
                </Link>
              </>
            )}
            {appointment.inquiry && (
              <>
                {" · "}
                <Link href={`/anfragen/${appointment.inquiry.id}`} className="hover:underline">
                  {appointment.inquiry.title}
                </Link>
              </>
            )}
          </p>
          <p className="text-sm text-ink-500 mt-1 font-mono">
            {appointment.scheduledAt?.toLocaleDateString("de-DE")}
            {appointment.scheduledAt && ` · ${appointment.scheduledAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`}
            {appointment.endAt && ` – ${appointment.endAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`}
            {appointment.amount != null && ` · ${Number(appointment.amount).toLocaleString("de-DE")} €`}
          </p>
          <p className="text-sm text-ink-500 mt-1">
            Zuständig: {appointment.assignee?.name ?? "Niemand"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AppointmentAssigneeSelect
            appointmentId={appointment.id}
            assigneeId={appointment.assigneeId}
            users={users}
          />
          <AppointmentStatusSelect
            appointmentId={appointment.id}
            status={appointment.status}
            customerId={appointment.customer?.id}
          />
        </div>
      </div>

      <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card">
        <h2 className="font-display font-semibold text-ink-900 mb-3">Notizen</h2>
        <RecordNotes
          link={link}
          notes={appointment.comments.map((c) => ({ id: c.id, content: c.content, createdAt: c.createdAt, user: c.user }))}
        />
      </div>

      <div className="rounded-card border border-ink-100 bg-surface p-6 shadow-card">
        <h2 className="font-display font-semibold text-ink-900 mb-3">Verknüpfte Aufgaben</h2>
        <RecordTasks
          link={link}
          tasks={appointment.tasks.map((t) => ({ id: t.id, title: t.title, status: t.status, dueDate: t.dueDate }))}
        />
      </div>
    </div>
  );
}
