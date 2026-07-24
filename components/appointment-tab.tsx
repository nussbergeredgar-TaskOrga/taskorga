"use client";

import { useRef, useState, useTransition } from "react";
import { createAppointment, updateAppointmentStatus } from "@/lib/actions/appointments";
import type { AppointmentStatus, AppointmentType } from "@prisma/client";

type Appointment = {
  id: string;
  title: string;
  type: AppointmentType;
  status: AppointmentStatus;
  requestedAt: Date | null;
};

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  REQUESTED: "Angefragt",
  SCHEDULED: "Geplant",
  DONE: "Erledigt",
  CANCELLED: "Storniert",
};

const TYPE_LABELS: Record<AppointmentType, string> = {
  CALLBACK_REQUEST: "Rückruf",
  ON_SITE_VISIT: "Vor-Ort-Termin",
  MEETING: "Besprechung",
};

export function AppointmentTab({
  customerId,
  appointments,
}: {
  customerId: string;
  appointments: Appointment[];
}) {
  const titleRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<AppointmentType>("CALLBACK_REQUEST");
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <input
          ref={titleRef}
          placeholder="z. B. Rückruf wegen Wallbox"
          className="sm:col-span-2 rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as AppointmentType)}
          className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-white"
        >
          <option value="CALLBACK_REQUEST">Rückruf</option>
          <option value="ON_SITE_VISIT">Vor-Ort-Termin</option>
          <option value="MEETING">Besprechung</option>
        </select>
        <input ref={dateRef} type="date" className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500" />
      </div>
      <button
        disabled={pending}
        onClick={() => {
          const title = titleRef.current?.value ?? "";
          if (!title.trim()) return;
          startTransition(async () => {
            await createAppointment(customerId, {
              title,
              type,
              requestedAt: dateRef.current?.value || undefined,
            });
            if (titleRef.current) titleRef.current.value = "";
            if (dateRef.current) dateRef.current.value = "";
          });
        }}
        className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 disabled:opacity-60 transition-colors"
      >
        Terminanfrage hinzufügen
      </button>

      <div className="space-y-2 pt-2">
        {appointments.map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded-lg border-l-4 border-l-turquoise-500 bg-ink-50 p-3 text-sm">
            <div>
              <p className="font-medium text-ink-900">{a.title}</p>
              <p className="text-xs text-ink-500">
                {TYPE_LABELS[a.type]}
                {a.requestedAt && ` · ${a.requestedAt.toLocaleDateString("de-DE")}`}
              </p>
            </div>
            <select
              value={a.status}
              disabled={pending}
              onChange={(e) =>
                startTransition(() =>
                  updateAppointmentStatus(a.id, customerId, e.target.value as AppointmentStatus)
                )
              }
              className="text-xs rounded-lg border border-ink-100 px-2 py-1 bg-white outline-none"
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        ))}
        {appointments.length === 0 && (
          <p className="text-xs text-ink-300">Noch keine Termine.</p>
        )}
      </div>
    </div>
  );
}
