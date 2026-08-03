"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { createAppointment, updateAppointmentStatus } from "@/lib/actions/appointments";
import { createInquiryQuick } from "@/lib/actions/inquiries";
import type { AppointmentStatus } from "@prisma/client";
import type { FieldConfigMap } from "@/lib/actions/field-config";

type Appointment = {
  id: string;
  title: string;
  type: string;
  status: AppointmentStatus;
  scheduledAt: Date | null;
  endAt: Date | null;
  amount: number | null;
};

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  REQUESTED: "Angefragt",
  SCHEDULED: "Geplant",
  DONE: "Erledigt",
  CANCELLED: "Storniert",
};

function formatRange(start: Date | null, end: Date | null) {
  if (!start) return "";
  const dateStr = start.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  const startTime = start.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  const endTime = end ? end.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : null;
  return endTime ? `${dateStr}, ${startTime} – ${endTime} Uhr` : `${dateStr}, ${startTime} Uhr`;
}

export function AppointmentTab({
  customerId,
  appointments,
  inquiries,
  appointmentTypes,
  fieldConfig,
  users,
  currentUserId,
}: {
  customerId: string;
  appointments: Appointment[];
  inquiries: { id: string; title: string }[];
  appointmentTypes: { id: string; label: string }[];
  fieldConfig?: FieldConfigMap;
  users: { id: string; name: string }[];
  currentUserId: string;
}) {
  const fc = (key: string) => fieldConfig?.[key] ?? { visible: true, required: false };
  const [assigneeId, setAssigneeId] = useState(currentUserId);
  const titleRef = useRef<HTMLInputElement>(null);
  const startDateRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);
  const endTimeRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState(appointmentTypes[0]?.label ?? "");
  const [inquiryId, setInquiryId] = useState("");
  const [showNewInquiry, setShowNewInquiry] = useState(false);
  const newInquiryTitleRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    const title = titleRef.current?.value ?? "";
    const startDate = startDateRef.current?.value ?? "";
    const startTime = startTimeRef.current?.value ?? "";
    const endDate = endDateRef.current?.value ?? "";
    const endTime = endTimeRef.current?.value ?? "";
    setError("");

    if (!title.trim()) {
      setError("Bitte einen Titel eingeben.");
      return;
    }
    if (!startDate || !startTime || !endDate || !endTime) {
      setError("Bitte Datum und Uhrzeit für Von und Bis angeben.");
      return;
    }

    const startAt = `${startDate}T${startTime}`;
    const endAt = `${endDate}T${endTime}`;

    if (new Date(endAt) <= new Date(startAt)) {
      setError("Die Bis-Zeit muss nach der Von-Zeit liegen.");
      return;
    }
    if (fc("amount").required && !amountRef.current?.value?.trim()) {
      setError("Betrag ist ein Pflichtfeld.");
      return;
    }

    startTransition(async () => {
      let finalInquiryId = inquiryId;
      const newTitle = newInquiryTitleRef.current?.value ?? "";

      if (showNewInquiry && newTitle.trim()) {
        const created = await createInquiryQuick(customerId, { title: newTitle });
        finalInquiryId = created.inquiry?.id ?? "";
      }

      const result = await createAppointment(customerId, {
        title,
        type,
        startAt,
        endAt,
        inquiryId: finalInquiryId || undefined,
        amount: amountRef.current?.value,
        assigneeId: assigneeId || undefined,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (titleRef.current) titleRef.current.value = "";
      if (startDateRef.current) startDateRef.current.value = "";
      if (startTimeRef.current) startTimeRef.current.value = "";
      if (endDateRef.current) endDateRef.current.value = "";
      if (endTimeRef.current) endTimeRef.current.value = "";
      if (amountRef.current) amountRef.current.value = "";
      if (newInquiryTitleRef.current) newInquiryTitleRef.current.value = "";
      setInquiryId("");
      setShowNewInquiry(false);
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <input
          ref={titleRef}
          placeholder="z. B. Rückruf wegen Wallbox"
          className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />

        {inquiries.length > 0 && !showNewInquiry && (
          <select
            value={inquiryId}
            onChange={(e) => setInquiryId(e.target.value)}
            className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
          >
            <option value="">Keine zugehörige Anfrage</option>
            {inquiries.map((i) => (
              <option key={i.id} value={i.id}>
                {i.title}
              </option>
            ))}
          </select>
        )}

        {!showNewInquiry ? (
          <button
            type="button"
            onClick={() => {
              setShowNewInquiry(true);
              setInquiryId("");
            }}
            className="text-xs text-brand-700 hover:underline"
          >
            + Neue Anfrage anlegen
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              ref={newInquiryTitleRef}
              placeholder="Titel der neuen Anfrage …"
              className="flex-1 rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <button
              type="button"
              onClick={() => setShowNewInquiry(false)}
              className="text-xs text-ink-500 hover:text-danger transition-colors whitespace-nowrap"
            >
              Entfernen
            </button>
          </div>
        )}

        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
        >
          {appointmentTypes.map((t) => (
            <option key={t.id} value={t.label}>
              {t.label}
            </option>
          ))}
        </select>

        <select
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
        >
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.id === currentUserId ? `${u.name} (ich)` : u.name}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-ink-500 mb-1">Von — Datum</label>
            <input
              ref={startDateRef}
              type="date"
              className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs text-ink-500 mb-1">Von — Uhrzeit</label>
            <input
              ref={startTimeRef}
              type="time"
              className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs text-ink-500 mb-1">Bis — Datum</label>
            <input
              ref={endDateRef}
              type="date"
              className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs text-ink-500 mb-1">Bis — Uhrzeit</label>
            <input
              ref={endTimeRef}
              type="time"
              className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {fc("amount").visible && (
          <div>
            <label className="block text-xs text-ink-500 mb-1">
              Betrag (€)
              {fc("amount").required && <span className="text-danger ml-0.5">*</span>}
            </label>
            <input
              ref={amountRef}
              type="number"
              step="0.01"
              placeholder={fc("amount").required ? "" : "optional"}
              className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 font-mono"
            />
          </div>
        )}
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>

      <button
        disabled={pending}
        onClick={submit}
        className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 disabled:opacity-60 transition-colors"
      >
        Termin hinzufügen
      </button>

      <div className="space-y-2 pt-2">
        {appointments.map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded-lg border-l-4 border-l-turquoise-500 bg-ink-50 p-3 text-sm">
            <div>
              <Link href={`/termine/${a.id}`} className="font-medium text-ink-900 hover:underline">
                {a.title}
              </Link>
              <p className="text-xs text-ink-500">
                {a.type} · {formatRange(a.scheduledAt, a.endAt)}
                {a.amount != null && ` · ${a.amount.toLocaleString("de-DE")} €`}
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
              className="text-xs rounded-lg border border-ink-100 px-2 py-1 bg-surface outline-none"
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
