"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAppointmentAssignee } from "@/lib/actions/appointments";

export function AppointmentAssigneeSelect({
  appointmentId,
  assigneeId,
  users,
}: {
  appointmentId: string;
  assigneeId: string | null;
  users: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={assigneeId ?? ""}
      disabled={pending}
      onChange={(e) =>
        startTransition(async () => {
          await updateAppointmentAssignee(appointmentId, e.target.value);
          router.refresh();
        })
      }
      className="rounded-lg border border-ink-100 px-3 py-2 text-sm bg-surface outline-none focus:border-brand-500"
    >
      <option value="">Niemand zugewiesen</option>
      {users.map((u) => (
        <option key={u.id} value={u.id}>
          {u.name}
        </option>
      ))}
    </select>
  );
}
