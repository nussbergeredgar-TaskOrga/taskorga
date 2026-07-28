"use client";

import { useState } from "react";
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

  function openForDay(dateKey: string) {
    setDefaultDate(dateKey);
    setFormOpen(true);
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
        <p className="text-xs text-ink-300">Tipp: Doppelklick auf einen Kalendertag legt direkt einen Termin an diesem Tag an.</p>
      </div>

      <div className="rounded-card border border-ink-100 bg-surface p-4 shadow-card overflow-x-auto">
        <div className="grid grid-cols-7 min-w-[640px] gap-px bg-ink-100 rounded-lg overflow-hidden">
          {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => (
            <div key={d} className="bg-ink-50 px-2 py-1.5 text-xs font-medium text-ink-500 text-center">
              {d}
            </div>
          ))}
          {days.map((day) => (
            <div
              key={day.key}
              onDoubleClick={() => {
                setDefaultDate(day.key);
                openForDay(day.key);
              }}
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
                    href={a.customerId ? `/kunden/${a.customerId}` : "#"}
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
    </div>
  );
}
