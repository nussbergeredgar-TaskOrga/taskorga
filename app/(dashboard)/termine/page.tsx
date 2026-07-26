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
import { cn } from "@/lib/utils";

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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

      <div className="rounded-card border border-ink-100 bg-surface p-4 shadow-card overflow-x-auto">
        <div className="grid grid-cols-7 min-w-[640px] gap-px bg-ink-100 rounded-lg overflow-hidden">
          {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => (
            <div key={d} className="bg-ink-50 px-2 py-1.5 text-xs font-medium text-ink-500 text-center">
              {d}
            </div>
          ))}
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayAppointments = appointmentsByDay.get(key) ?? [];
            const inMonth = isSameMonth(day, anchorDate);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={key}
                className={cn(
                  "bg-surface min-h-[92px] p-1.5 align-top",
                  !inMonth && "bg-ink-50"
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-mono",
                    isToday ? "bg-brand-500 text-white" : inMonth ? "text-ink-700" : "text-ink-300"
                  )}
                >
                  {format(day, "d")}
                </span>
                <div className="mt-1 space-y-1">
                  {dayAppointments.slice(0, 3).map((a) => (
                    <Link
                      key={a.id}
                      href={a.customer ? `/kunden/${a.customer.id}` : "#"}
                      className="block truncate rounded bg-turquoise-100 px-1.5 py-0.5 text-[11px] text-turquoise-700 hover:bg-turquoise-500 hover:text-white transition-colors"
                      title={`${a.title} — ${a.customer?.name ?? ""}`}
                    >
                      {a.scheduledAt && format(a.scheduledAt, "HH:mm")} {a.title}
                    </Link>
                  ))}
                  {dayAppointments.length > 3 && (
                    <span className="block text-[11px] text-ink-300">
                      +{dayAppointments.length - 3} weitere
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
                href={a.customer ? `/kunden/${a.customer.id}` : "#"}
                className="flex items-center justify-between rounded-lg border-l-4 border-l-turquoise-500 bg-ink-50 px-3 py-2.5 text-sm hover:bg-ink-100 transition-colors"
              >
                <div>
                  <span className="font-medium text-ink-900">{a.title}</span>
                  <span className="text-ink-500 ml-2">{a.customer?.name ?? "Kein Kunde"}</span>
                </div>
                <span className="font-mono text-xs text-ink-500">
                  {a.scheduledAt && format(a.scheduledAt, "dd.MM. HH:mm")}
                  {a.endAt && ` – ${format(a.endAt, "HH:mm")}`}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
