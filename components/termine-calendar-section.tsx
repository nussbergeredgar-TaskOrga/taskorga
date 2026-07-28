"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AppointmentQuickForm } from "@/components/appointment-quick-form";

type DayAppointment = {
  id: string;
  title: string;
  time: string;
  customerId: string | null;
  customerName: string | null;
};

type Day = {
  key: string;
  dayNumber: string;
  inMonth: boolean;
  isToday: boolean;
  appointments: DayAppointment[];
};

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const WEEKDAY_FULL = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

type ViewMode = "monat" | "woche" | "tag";

export function TermineCalendarSection({
  days,
  customers,
  inquiries,
  appointmentTypes,
}: {
  days: Day[];
  customers: { id: string; name: string }[];
  inquiries: { id: string; title: string; customerId: string }[];
  appointmentTypes: { id: string; label: string }[];
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [defaultDate, setDefaultDate] = useState<string | undefined>(undefined);
  const [view, setView] = useState<ViewMode>("monat");
  const [selectedIndex, setSelectedIndex] = useState(() => {
    const todayIdx = days.findIndex((d) => d.isToday);
    return todayIdx >= 0 ? todayIdx : 0;
  });

  function openForDay(dateKey: string) {
    setDefaultDate(dateKey);
    setFormOpen(true);
  }

  const weekDays = useMemo(() => {
    const weekIndex = Math.floor(selectedIndex / 7);
    return days.slice(weekIndex * 7, weekIndex * 7 + 7);
  }, [days, selectedIndex]);

  const selectedDay = days[selectedIndex];

  function shiftDay(delta: number) {
    setSelectedIndex((i) => Math.max(0, Math.min(days.length - 1, i + delta)));
  }

  function shiftWeek(delta: number) {
    setSelectedIndex((i) => Math.max(0, Math.min(days.length - 1, i + delta * 7)));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <AppointmentQuickForm
          customers={customers}
          inquiries={inquiries}
          appointmentTypes={appointmentTypes}
          open={formOpen}
          onOpenChange={setFormOpen}
          defaultDate={defaultDate}
        />
        <div className="flex items-center gap-2">
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
          <div className="rounded-card border border-ink-100 bg-surface p-4 shadow-card overflow-x-auto">
            <div className="grid grid-cols-7 min-w-[640px] gap-px bg-ink-100 rounded-lg overflow-hidden">
              {WEEKDAY_LABELS.map((d) => (
                <div key={d} className="bg-ink-50 px-2 py-1.5 text-xs font-medium text-ink-500 text-center">
                  {d}
                </div>
              ))}
              {days.map((day, i) => (
                <div
                  key={day.key}
                  onClick={() => setSelectedIndex(i)}
                  onDoubleClick={() => openForDay(day.key)}
                  title="Doppelklick: neuer Termin an diesem Tag"
                  className={cn(
                    "bg-surface min-h-[92px] p-1.5 align-top cursor-pointer hover:bg-brand-50/50 transition-colors",
                    !day.inMonth && "bg-ink-50"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-mono",
                      day.isToday ? "bg-brand-500 text-white" : day.inMonth ? "text-ink-700" : "text-ink-300"
                    )}
                  >
                    {day.dayNumber}
                  </span>
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
              ))}
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
          <div className="rounded-card border border-ink-100 bg-surface p-4 shadow-card overflow-x-auto">
            <div className="grid grid-cols-7 min-w-[840px] gap-px bg-ink-100 rounded-lg overflow-hidden">
              {weekDays.map((day) => (
                <div key={day.key} className="bg-surface min-h-[220px] p-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-ink-500">
                      {WEEKDAY_LABELS[new Date(day.key).getDay() === 0 ? 6 : new Date(day.key).getDay() - 1]}
                    </span>
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-mono",
                        day.isToday ? "bg-brand-500 text-white" : "text-ink-700"
                      )}
                    >
                      {day.dayNumber}
                    </span>
                  </div>
                  <div
                    className="space-y-1 cursor-pointer"
                    onDoubleClick={() => openForDay(day.key)}
                    title="Doppelklick: neuer Termin an diesem Tag"
                  >
                    {day.appointments.map((a) => (
                      <Link
                        key={a.id}
                        href={`/termine/${a.id}`}
                        className="block truncate rounded bg-turquoise-100 px-1.5 py-1 text-[11px] text-turquoise-700 hover:bg-turquoise-500 hover:text-white transition-colors"
                        title={`${a.title} — ${a.customerName ?? ""}`}
                      >
                        {a.time} {a.title}
                      </Link>
                    ))}
                    {day.appointments.length === 0 && (
                      <p className="text-[11px] text-ink-300">Keine Termine</p>
                    )}
                  </div>
                </div>
              ))}
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
              {WEEKDAY_FULL[new Date(selectedDay.key).getDay() === 0 ? 6 : new Date(selectedDay.key).getDay() - 1]},{" "}
              {selectedDay.key.split("-").reverse().join(".")}
            </span>
            <button onClick={() => shiftDay(1)} className="text-sm text-ink-500 hover:text-ink-900 transition-colors">
              Nächster Tag →
            </button>
          </div>
          <div className="rounded-card border border-ink-100 bg-surface p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold text-ink-900">
                {selectedDay.appointments.length} Termin{selectedDay.appointments.length !== 1 ? "e" : ""}
              </h3>
              <button
                onClick={() => openForDay(selectedDay.key)}
                className="text-xs text-brand-700 hover:underline"
              >
                + Termin an diesem Tag anlegen
              </button>
            </div>
            <div className="space-y-2">
              {selectedDay.appointments.map((a) => (
                <Link
                  key={a.id}
                  href={`/termine/${a.id}`}
                  className="flex items-center justify-between rounded-lg border-l-4 border-l-turquoise-500 bg-ink-50 px-3 py-2.5 text-sm hover:bg-ink-100 transition-colors"
                >
                  <span className="font-medium text-ink-900">{a.title}</span>
                  <span className="font-mono text-xs text-ink-500">
                    {a.time} {a.customerName && `· ${a.customerName}`}
                  </span>
                </Link>
              ))}
              {selectedDay.appointments.length === 0 && (
                <p className="text-sm text-ink-300">Keine Termine an diesem Tag.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
