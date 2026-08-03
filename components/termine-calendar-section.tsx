"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AppointmentQuickForm } from "@/components/appointment-quick-form";
import type { FieldConfigMap } from "@/lib/actions/field-config";

type DayAppointment = {
  id: string;
  title: string;
  time: string;
  startMinutes: number;
  endMinutes: number;
  customerId: string | null;
  customerName: string | null;
  assigneeName?: string | null;
  assigneeId?: string | null;
};

type Day = {
  key: string;
  dayNumber: string;
  inMonth: boolean;
  isToday: boolean;
  appointments: DayAppointment[];
};

type WorkingHourRow = { weekday: number; startTime: string; endTime: string; isWorkingDay: boolean };
type AbsenceRow = { userId: string | null; type: string; startDate: string; endDate: string; note: string | null };

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const WEEKDAY_FULL = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const ABSENCE_LABELS: Record<string, string> = { URLAUB: "Urlaub", FREI: "Frei", FEIERTAG: "Feiertag" };

const HOUR_START = 6;
const HOUR_END = 21;
const HOUR_HEIGHT = 52; // px pro Stunde

function weekdayIndex(dateKey: string) {
  const d = new Date(dateKey).getDay();
  return d === 0 ? 6 : d - 1; // Montag=0 … Sonntag=6
}

function timeToMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

type ViewMode = "monat" | "woche" | "tag";

export function TermineCalendarSection({
  days,
  customers,
  inquiries,
  appointmentTypes,
  fieldConfig,
  workingHoursByUser,
  absences,
  users,
  currentUserId,
}: {
  days: Day[];
  customers: { id: string; name: string }[];
  inquiries: { id: string; title: string; customerId: string }[];
  appointmentTypes: { id: string; label: string }[];
  fieldConfig?: FieldConfigMap;
  workingHoursByUser: Record<string, WorkingHourRow[]>;
  absences: AbsenceRow[];
  users: { id: string; name: string }[];
  currentUserId: string;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [defaultDate, setDefaultDate] = useState<string | undefined>(undefined);
  const [view, setView] = useState<ViewMode>("monat");
  const [personFilter, setPersonFilter] = useState<string>(currentUserId);
  const [selectedIndex, setSelectedIndex] = useState(() => {
    const todayIdx = days.findIndex((d) => d.isToday);
    return todayIdx >= 0 ? todayIdx : 0;
  });

  function openForDay(dateKey: string) {
    setDefaultDate(dateKey);
    setFormOpen(true);
  }

  // Termine ggf. nach ausgewählter Person filtern (leer = alle)
  const visibleDays = useMemo(() => {
    if (!personFilter) return days;
    return days.map((d) => ({ ...d, appointments: d.appointments.filter((a) => a.assigneeId === personFilter) }));
  }, [days, personFilter]);

  const weekDays = useMemo(() => {
    const weekIndex = Math.floor(selectedIndex / 7);
    return visibleDays.slice(weekIndex * 7, weekIndex * 7 + 7);
  }, [visibleDays, selectedIndex]);

  const selectedDay = visibleDays[selectedIndex];

  function shiftDay(delta: number) {
    setSelectedIndex((i) => Math.max(0, Math.min(days.length - 1, i + delta)));
  }

  function shiftWeek(delta: number) {
    setSelectedIndex((i) => Math.max(0, Math.min(days.length - 1, i + delta * 7)));
  }

  function absenceFor(dateKey: string) {
    return absences.find((a) => {
      if (a.type !== "FEIERTAG" && a.userId !== (personFilter || currentUserId)) return false;
      return dateKey >= a.startDate && dateKey <= a.endDate;
    });
  }

  const hourMarks = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);
  const gridHeight = (HOUR_END - HOUR_START) * HOUR_HEIGHT;

  function workingHoursFor(dateKey: string) {
    const refUserId = personFilter || currentUserId;
    const wh = workingHoursByUser[refUserId]?.find((h) => h.weekday === weekdayIndex(dateKey));
    return wh ?? { startTime: "08:00", endTime: "17:00", isWorkingDay: true };
  }

  function blockStyle(a: DayAppointment) {
    const clampedStart = Math.max(a.startMinutes, HOUR_START * 60);
    const clampedEnd = Math.max(Math.min(a.endMinutes, HOUR_END * 60), clampedStart + 15);
    const top = ((clampedStart - HOUR_START * 60) / 60) * HOUR_HEIGHT;
    const height = ((clampedEnd - clampedStart) / 60) * HOUR_HEIGHT;
    return { top, height: Math.max(height, 20) };
  }

  function DayColumn({ day, narrow }: { day: Day; narrow?: boolean }) {
    const wh = workingHoursFor(day.key);
    const absence = absenceFor(day.key);
    const nonWorkingTop = wh.isWorkingDay
      ? Math.max(0, ((timeToMinutes(wh.startTime) - HOUR_START * 60) / 60) * HOUR_HEIGHT)
      : 0;
    const nonWorkingBottomStart = wh.isWorkingDay
      ? ((timeToMinutes(wh.endTime) - HOUR_START * 60) / 60) * HOUR_HEIGHT
      : 0;

    return (
      <div
        className="relative border-l border-ink-100 first:border-l-0"
        style={{ height: gridHeight }}
        onDoubleClick={() => openForDay(day.key)}
        title="Doppelklick: neuer Termin"
      >
        {hourMarks.slice(0, -1).map((h, i) => (
          <div
            key={h}
            className="absolute left-0 right-0 border-t border-ink-100"
            style={{ top: i * HOUR_HEIGHT }}
          />
        ))}

        {!wh.isWorkingDay && <div className="absolute inset-0 bg-ink-50/60" />}
        {wh.isWorkingDay && (
          <>
            <div className="absolute left-0 right-0 bg-ink-50/40" style={{ top: 0, height: nonWorkingTop }} />
            <div
              className="absolute left-0 right-0 bg-ink-50/40"
              style={{ top: nonWorkingBottomStart, height: gridHeight - nonWorkingBottomStart }}
            />
          </>
        )}

        {absence && (
          <div className="absolute inset-x-0 top-0 z-10 bg-warning/15 text-warning text-[10px] font-medium text-center py-0.5">
            {ABSENCE_LABELS[absence.type] ?? absence.type}
          </div>
        )}

        {day.appointments.map((a) => {
          const { top, height } = blockStyle(a);
          return (
            <Link
              key={a.id}
              href={`/termine/${a.id}`}
              onClick={(e) => e.stopPropagation()}
              className="absolute left-1 right-1 z-20 rounded bg-turquoise-500 text-white px-1.5 py-0.5 text-[11px] overflow-hidden hover:bg-turquoise-700 transition-colors shadow-sm"
              style={{ top, height }}
              title={`${a.time} ${a.title}${a.customerName ? " — " + a.customerName : ""}${a.assigneeName ? " · " + a.assigneeName : ""}`}
            >
              <span className="font-medium">{a.time}</span> {a.title}
              {!narrow && a.customerName && <span className="block truncate opacity-90">{a.customerName}</span>}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <AppointmentQuickForm
          customers={customers}
          inquiries={inquiries}
          appointmentTypes={appointmentTypes}
          fieldConfig={fieldConfig}
          users={users}
          currentUserId={currentUserId}
          open={formOpen}
          onOpenChange={setFormOpen}
          defaultDate={defaultDate}
        />
        <div className="flex items-center gap-2">
          <select
            value={personFilter}
            onChange={(e) => setPersonFilter(e.target.value)}
            className="rounded-lg border border-ink-100 px-3 py-1.5 text-xs bg-surface outline-none focus:border-brand-500"
          >
            <option value="">Alle Personen</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.id === currentUserId ? `${u.name} (ich)` : u.name}
              </option>
            ))}
          </select>
          <div className="inline-flex rounded-lg border border-ink-100 p-1">
            {(["monat", "woche", "tag"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                  view === v ? "bg-brand-500 text-white" : "text-ink-700 hover:bg-ink-50"
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === "monat" && (
        <>
          <p className="text-xs text-ink-300">Tipp: Doppelklick auf einen Kalendertag legt direkt einen Termin an diesem Tag an.</p>
          <div className="rounded-card border border-ink-100 bg-surface p-2 sm:p-4 shadow-card overflow-x-auto">
            <div className="grid grid-cols-7 sm:min-w-[640px] gap-px bg-ink-100 rounded-lg overflow-hidden">
              {WEEKDAY_LABELS.map((d) => (
                <div key={d} className="bg-ink-50 px-1 sm:px-2 py-1.5 text-xs font-medium text-ink-500 text-center">
                  {d}
                </div>
              ))}
              {visibleDays.map((day, i) => {
                const absence = absenceFor(day.key);
                return (
                  <div
                    key={day.key}
                    onClick={() => setSelectedIndex(i)}
                    onDoubleClick={() => openForDay(day.key)}
                    title="Doppelklick: neuer Termin an diesem Tag"
                    className={cn(
                      "bg-surface min-h-[64px] sm:min-h-[92px] p-1 sm:p-1.5 align-top cursor-pointer hover:bg-brand-50/50 transition-colors",
                      !day.inMonth && "bg-ink-50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-mono",
                          day.isToday ? "bg-brand-500 text-white" : day.inMonth ? "text-ink-700" : "text-ink-300"
                        )}
                      >
                        {day.dayNumber}
                      </span>
                      {absence && (
                        <span className="text-[9px] font-medium text-warning">{ABSENCE_LABELS[absence.type]}</span>
                      )}
                    </div>
                    <div className="mt-1 space-y-1">
                      {day.appointments.slice(0, 3).map((a) => (
                        <Link
                          key={a.id}
                          href={`/termine/${a.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="block truncate rounded bg-turquoise-100 px-1.5 py-0.5 text-[11px] text-turquoise-700 hover:bg-turquoise-500 hover:text-white transition-colors"
                          title={`${a.title} — ${a.customerName ?? ""}`}
                        >
                          {a.time} {a.title}
                        </Link>
                      ))}
                      {day.appointments.length > 3 && (
                        <span className="block text-[11px] text-ink-300">+{day.appointments.length - 3} weitere</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {view === "woche" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <button onClick={() => shiftWeek(-1)} className="text-sm text-ink-500 hover:text-ink-900 transition-colors">
              ← Vorherige Woche
            </button>
            <button onClick={() => shiftWeek(1)} className="text-sm text-ink-500 hover:text-ink-900 transition-colors">
              Nächste Woche →
            </button>
          </div>
          <div className="rounded-card border border-ink-100 bg-surface p-2 sm:p-4 shadow-card overflow-x-auto">
            <div className="flex sm:min-w-[880px]">
              <div className="w-10 sm:w-14 shrink-0">
                <div className="h-8" />
                {hourMarks.slice(0, -1).map((h) => (
                  <div key={h} style={{ height: HOUR_HEIGHT }} className="text-[10px] text-ink-300 font-mono -mt-2">
                    {String(h).padStart(2, "0")}:00
                  </div>
                ))}
              </div>
              <div className="flex-1 grid grid-cols-7">
                {weekDays.map((day) => (
                  <div key={day.key}>
                    <div className="h-8 flex flex-col items-center justify-center border-b border-ink-100">
                      <span className="text-[10px] text-ink-500">{WEEKDAY_LABELS[weekdayIndex(day.key)]}</span>
                      <span
                        className={cn(
                          "text-xs font-mono",
                          day.isToday ? "text-brand-500 font-semibold" : "text-ink-700"
                        )}
                      >
                        {day.dayNumber}
                      </span>
                    </div>
                    <DayColumn day={day} narrow />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {view === "tag" && selectedDay && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <button onClick={() => shiftDay(-1)} className="text-sm text-ink-500 hover:text-ink-900 transition-colors">
              ← Vorheriger Tag
            </button>
            <span className="text-sm font-medium text-ink-900">
              {WEEKDAY_FULL[weekdayIndex(selectedDay.key)]}, {selectedDay.key.split("-").reverse().join(".")}
            </span>
            <button onClick={() => shiftDay(1)} className="text-sm text-ink-500 hover:text-ink-900 transition-colors">
              Nächster Tag →
            </button>
          </div>
          <div className="rounded-card border border-ink-100 bg-surface p-4 shadow-card overflow-x-auto">
            <div className="flex min-w-[500px]">
              <div className="w-14 shrink-0">
                {hourMarks.slice(0, -1).map((h) => (
                  <div key={h} style={{ height: HOUR_HEIGHT }} className="text-[10px] text-ink-300 font-mono -mt-2">
                    {String(h).padStart(2, "0")}:00
                  </div>
                ))}
              </div>
              <div className="flex-1">
                <DayColumn day={selectedDay} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
