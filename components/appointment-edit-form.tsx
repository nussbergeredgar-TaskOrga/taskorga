"use client";

import { useRef, useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { updateAppointment } from "@/lib/actions/appointments";
import { CustomerAutocomplete } from "@/components/customer-autocomplete";
import type { FieldConfigMap } from "@/lib/actions/field-config";

const DEFAULT_FIELD_STATE = { visible: true, required: false };

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}
function toTimeInput(d: Date) {
  return d.toTimeString().slice(0, 5);
}

export function AppointmentEditForm({
  appointmentId,
  customers,
  appointmentTypes,
  fieldConfig,
  initial,
}: {
  appointmentId: string;
  customers: { id: string; name: string }[];
  appointmentTypes: { id: string; label: string }[];
  fieldConfig?: FieldConfigMap;
  initial: {
    customerId: string;
    title: string;
    type: string;
    scheduledAt: Date;
    endAt: Date;
    amount: number | null;
  };
}) {
  const fc = (key: string) => fieldConfig?.[key] ?? DEFAULT_FIELD_STATE;
  const [editing, setEditing] = useState(false);
  const [customerId, setCustomerId] = useState(initial.customerId);
  const [type, setType] = useState(initial.type);
  const titleRef = useRef<HTMLInputElement>(null);
  const startDateRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);
  const endTimeRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    const title = titleRef.current?.value ?? "";
    const startDate = startDateRef.current?.value ?? "";
    const startTime = startTimeRef.current?.value ?? "";
    const endDate = endDateRef.current?.value ?? "";
    const endTime = endTimeRef.current?.value ?? "";
    setError("");

    if (!customerId) {
      setError("Bitte einen Kunden auswählen.");
      return;
    }
    if (!title.trim()) {
      setError("Bitte einen Titel eingeben.");
      return;
    }
    if (!startDate || !startTime || !endDate || !endTime) {
      setError("Bitte Datum und Uhrzeit für Von und Bis angeben.");
      return;
    }

    startTransition(async () => {
      const result = await updateAppointment(appointmentId, {
        customerId,
        title,
        type,
        startAt: `${startDate}T${startTime}`,
        endAt: `${endDate}T${endTime}`,
        amount: amountRef.current?.value,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-1.5 rounded-lg border border-ink-100 text-ink-700 text-sm font-medium px-3 py-2 hover:bg-ink-50 transition-colors"
      >
        <Pencil size={14} />
        Bearbeiten
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => setEditing(false)}
    >
      <div
        className="rounded-card border border-ink-100 bg-surface p-5 shadow-cardHover space-y-3 max-w-xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display font-semibold text-ink-900">Termin bearbeiten</h2>

        <div>
          <label className="block text-xs text-ink-500 mb-1">Kunde</label>
          <CustomerAutocomplete
            customers={customers}
            name="customerId"
            defaultCustomerId={customerId}
            onSelect={(id) => setCustomerId(id)}
          />
        </div>

        <div>
          <label className="block text-xs text-ink-500 mb-1">Titel</label>
          <input
            ref={titleRef}
            defaultValue={initial.title}
            className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
          />
        </div>

        <div>
          <label className="block text-xs text-ink-500 mb-1">Art</label>
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
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-ink-500 mb-1">Von — Datum</label>
            <input
              ref={startDateRef}
              type="date"
              defaultValue={toDateInput(initial.scheduledAt)}
              className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs text-ink-500 mb-1">Von — Uhrzeit</label>
            <input
              ref={startTimeRef}
              type="time"
              defaultValue={toTimeInput(initial.scheduledAt)}
              className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs text-ink-500 mb-1">Bis — Datum</label>
            <input
              ref={endDateRef}
              type="date"
              defaultValue={toDateInput(initial.endAt)}
              className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs text-ink-500 mb-1">Bis — Uhrzeit</label>
            <input
              ref={endTimeRef}
              type="time"
              defaultValue={toTimeInput(initial.endAt)}
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
              defaultValue={initial.amount != null ? String(initial.amount) : ""}
              placeholder={fc("amount").required ? "" : "optional"}
              className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 font-mono"
            />
          </div>
        )}

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            disabled={pending}
            onClick={submit}
            className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 disabled:opacity-60 transition-colors"
          >
            {pending ? "Wird gespeichert …" : "Änderungen speichern"}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="rounded-lg border border-ink-100 text-ink-700 text-sm font-medium px-4 py-2 hover:bg-ink-50 transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}
