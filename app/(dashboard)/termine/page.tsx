import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { de } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { TermineCalendarSection } from "@/components/termine-calendar-section";
import { getAppointmentTypes } from "@/lib/actions/appointment-types";
import { KpiCard } from "@/components/kpi-card";
import { CalendarCheck, CalendarClock, Wallet } from "lucide-react";

export default async function TerminePage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const company = await getCurrentCompany();

  const anchorDate = searchParams.month ? new Date(`${searchParams.month}-01`) : new Date();
  const monthStart = startOfMonth(anchorDate);
  const monthEnd = endOfMonth(anchorDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const appointments = await prisma.appointment.findMany({
    where: {
      companyId: company.id,
      scheduledAt: { gte: gridStart, lte: gridEnd },
    },
    orderBy: { scheduledAt: "asc" },
    include: { customer: { select: { id: true, name: true } } },
  });

  const customers = await prisma.customer.findMany({
    where: { companyId: company.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const openInquiries = await prisma.inquiry.findMany({
    where: { companyId: company.id, status: { notIn: ["WON", "LOST"] } },
    select: { id: true, title: true, customerId: true },
  });

  const appointmentTypes = await getAppointmentTypes();

  const prevMonth = format(subMonths(anchorDate, 1), "yyyy-MM");
  const nextMonth = format(addMonths(anchorDate, 1), "yyyy-MM");

  const appointmentsByDay = new Map<string, typeof appointments>();
  for (const a of appointments) {
    if (!a.scheduledAt) continue;
    const key = format(a.scheduledAt, "yyyy-MM-dd");
    if (!appointmentsByDay.has(key)) appointmentsByDay.set(key, []);
    appointmentsByDay.get(key)!.push(a);
  }

  const monthAppointments = appointments.filter((a) => a.scheduledAt && isSameMonth(a.scheduledAt, anchorDate));

  const todayCount = appointments.filter((a) => a.scheduledAt && isSameDay(a.scheduledAt, new Date())).length;
  const scheduledCount = monthAppointments.filter((a) => a.status === "SCHEDULED").length;
  const monthAmount = monthAppointments.reduce((sum, a) => sum + Number(a.amount ?? 0), 0);

  const calendarDays = days.map((day) => {
    const key = format(day, "yyyy-MM-dd");
    const dayAppointments = appointmentsByDay.get(key) ?? [];
    return {
      key,
      dayNumber: format(day, "d"),
      inMonth: isSameMonth(day, anchorDate),
      isToday: isSameDay(day, new Date()),
      appointments: dayAppointments.map((a) => ({
        id: a.id,
        title: a.title,
        time: a.scheduledAt ? format(a.scheduledAt, "HH:mm") : "",
        customerId: a.customer?.id ?? null,
        customerName: a.customer?.name ?? null,
      })),
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Termine</h1>
          <p className="text-sm text-ink-500 mt-1">
            {monthAppointments.length} Termin{monthAppointments.length !== 1 ? "e" : ""} in {format(anchorDate, "MMMM yyyy", { locale: de })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/termine?month=${prevMonth}`}
            className="rounded-lg border border-ink-100 p-2 hover:bg-ink-50 transition-colors"
            aria-label="Vorheriger Monat"
          >
            <ChevronLeft size={16} />
          </Link>
          <span className="text-sm font-medium text-ink-900 w-32 text-center">
            {format(anchorDate, "MMMM yyyy", { locale: de })}
          </span>
          <Link
            href={`/termine?month=${nextMonth}`}
            className="rounded-lg border border-ink-100 p-2 hover:bg-ink-50 transition-colors"
            aria-label="Nächster Monat"
          >
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Heutige Termine" value={String(todayCount)} icon={CalendarClock} accent="border-l-turquoise-500" />
        <KpiCard label="Ausgemachte Termine (Monat)" value={String(scheduledCount)} icon={CalendarCheck} accent="border-l-brand-500" />
        <KpiCard label="Betrag Termine (Monat)" value={`${monthAmount.toLocaleString("de-DE")} €`} icon={Wallet} accent="border-l-success" />
      </div>

      <TermineCalendarSection
        days={calendarDays}
        customers={customers}
        inquiries={openInquiries}
        appointmentTypes={appointmentTypes.map((t) => ({ id: t.id, label: t.label }))}
      />

      <div className="rounded-card border border-ink-100 bg-surface p-5 shadow-card">
        <h2 className="font-display font-semibold text-ink-900 mb-3">
          Termine im {format(anchorDate, "MMMM", { locale: de })}
        </h2>
        {monthAppointments.length === 0 ? (
          <p className="text-sm text-ink-500">Keine Termine in diesem Monat.</p>
        ) : (
          <div className="space-y-2">
            {monthAppointments.map((a) => (
              <Link
                key={a.id}
                href={`/termine/${a.id}`}
                className="flex items-center justify-between rounded-lg border-l-4 border-l-turquoise-500 bg-ink-50 px-3 py-2.5 text-sm hover:bg-ink-100 transition-colors"
              >
                <div>
                  <span className="font-medium text-ink-900">{a.title}</span>
                  <span className="text-ink-500 ml-2">{a.customer?.name ?? "Kein Kunde"}</span>
                </div>
                <span className="font-mono text-xs text-ink-500">
                  {a.scheduledAt && format(a.scheduledAt, "dd.MM. HH:mm")}
                  {a.endAt && ` – ${format(a.endAt, "HH:mm")}`}
                  {a.amount != null && ` · ${Number(a.amount).toLocaleString("de-DE")} €`}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
