"use client";

import { useRef, useState, useTransition } from "react";
import { createAppointment, updateAppointmentStatus } from "@/lib/actions/appointments";
import { createInquiryQuick } from "@/lib/actions/inquiries";
import type { AppointmentStatus, AppointmentType } from "@prisma/client";

type Appointment = {
  id: string;
  title: string;
  type: AppointmentType;
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

const TYPE_LABELS: Record<AppointmentType, string> = {
  CALLBACK_REQUEST: "Rückruf",
  ON_SITE_VISIT: "Vor-Ort-Termin",
  MEETING: "Besprechung",
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
}: {
  customerId: string;
  appointments: Appointment[];
  inquiries: { id: string; title: string }[];
}) {
  const titleRef = useRef<HTMLInputElement>(null);
  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<AppointmentType>("CALLBACK_REQUEST");
  const [inquiryId, setInquiryId] = useState("");
  const [showNewInquiry, setShowNewInquiry] = useState(false);
  const newInquiryTitleRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    const title = titleRef.current?.value ?? "";
    const startAt = startRef.current?.value ?? "";
    const endAt = endRef.current?.value ?? "";
    setError("");

    if (!title.trim()) {
      setError("Bitte einen Titel eingeben.");
      return;
    }
    if (!startAt || !endAt) {
      setError("Bitte Von- und Bis-Zeit angeben.");
      return;
    }
    if (new Date(endAt) <= new Date(startAt)) {
      setError("Die Bis-Zeit muss nach der Von-Zeit liegen.");
      return;
    }

    startTransition(async () => {
      let finalInquiryId = inquiryId;
      const newTitle = newInquiryTitleRef.current?.value ?? "";

      if (showNewInquiry && newTitle.trim()) {
        const created = await createInquiryQuick(customerId, { title: newTitle });
        finalInquiryId = created?.id ?? "";
      }

      await createAppointment(customerId, {
        title,
        type,
        startAt,
        endAt,
        inquiryId: finalInquiryId || undefined,
        amount: amountRef.current?.value,
      });
      if (titleRef.current) titleRef.current.value = "";
      if (startRef.current) startRef.current.value = "";
      if (endRef.current) endRef.current.value = "";
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

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as AppointmentType)}
            className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
          >
            <option value="CALLBACK_REQUEST">Rückruf</option>
            <option value="ON_SITE_VISIT">Vor-Ort-Termin</option>
            <option value="MEETING">Besprechung</option>
          </select>
          <div>
            <label className="block text-xs text-ink-500 mb-1">Von</label>
            <input
              ref={startRef}
              type="datetime-local"
              className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs text-ink-500 mb-1">Bis</label>
            <input
              ref={endRef}
              type="datetime-local"
              className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs text-ink-500 mb-1">Betrag (€)</label>
            <input
              ref={amountRef}
              type="number"
              step="0.01"
              placeholder="optional"
              className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 font-mono"
            />
          </div>
        </div>
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
              <p className="font-medium text-ink-900">{a.title}</p>
              <p className="text-xs text-ink-500">
                {TYPE_LABELS[a.type]} · {formatRange(a.scheduledAt, a.endAt)}
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
