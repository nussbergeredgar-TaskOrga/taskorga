"use client";

import { useTransition } from "react";
import { updateAppointmentStatus } from "@/lib/actions/appointments";
import type { AppointmentStatus } from "@prisma/client";

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  REQUESTED: "Angefragt",
  SCHEDULED: "Geplant",
  DONE: "Erledigt",
  CANCELLED: "Storniert",
};

export function AppointmentStatusSelect({
  appointmentId,
  status,
  customerId,
}: {
  appointmentId: string;
  status: AppointmentStatus;
  customerId?: string | null;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={pending}
      onChange={(e) =>
        startTransition(() =>
          updateAppointmentStatus(appointmentId, customerId ?? null, e.target.value as AppointmentStatus)
        )
      }
      className="rounded-lg border border-ink-100 px-3 py-2 text-sm bg-surface outline-none focus:border-brand-500"
    >
      {Object.entries(STATUS_LABELS).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
