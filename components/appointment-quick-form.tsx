"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createAppointment } from "@/lib/actions/appointments";
import { createInquiryQuick } from "@/lib/actions/inquiries";
import { CustomerAutocomplete } from "@/components/customer-autocomplete";
import type { FieldConfigMap } from "@/lib/actions/field-config";

type Inquiry = { id: string; title: string; customerId: string };
type AppointmentTypeItem = { id: string; label: string };

const DEFAULT_FIELD_STATE = { visible: true, required: false };

export function AppointmentQuickForm({
  customers,
  inquiries,
  appointmentTypes,
  fieldConfig,
  users,
  currentUserId,
  open: controlledOpen,
  onOpenChange,
  defaultDate,
}: {
  customers: { id: string; name: string }[];
  inquiries: Inquiry[];
  appointmentTypes: AppointmentTypeItem[];
  fieldConfig?: FieldConfigMap;
  users: { id: string; name: string }[];
  currentUserId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultDate?: string;
}) {
  const fc = (key: string) => fieldConfig?.[key] ?? DEFAULT_FIELD_STATE;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (v: boolean) => {
    setInternalOpen(v);
    onOpenChange?.(v);
  };

  const [customerId, setCustomerId] = useState("");
  const [inquiryMode, setInquiryMode] = useState<"none" | "existing" | "new">("none");
  const [inquiryId, setInquiryId] = useState("");
  const [assigneeId, setAssigneeId] = useState(currentUserId);
  const titleRef = useRef<HTMLInputElement>(null);
  const startDateRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);
  const endTimeRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const newInquiryTitleRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState(appointmentTypes[0]?.label ?? "");
  const [recurrence, setRecurrence] = useState<"NONE" | "WEEKLY" | "BIWEEKLY" | "MONTHLY">("NONE");
  const [recurrenceCount, setRecurrenceCount] = useState("4");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const relevantInquiries = inquiries.filter((i) => i.customerId === customerId);

  useEffect(() => {
    if (open && defaultDate) {
      if (startDateRef.current) startDateRef.current.value = defaultDate;
      if (endDateRef.current) endDateRef.current.value = defaultDate;
    }
  }, [open, defaultDate]);

  function reset() {
    setCustomerId("");
    setInquiryId("");
    setInquiryMode("none");
    setAssigneeId(currentUserId);
    setRecurrence("NONE");
    setRecurrenceCount("4");
    if (titleRef.current) titleRef.current.value = "";
    if (startDateRef.current) startDateRef.current.value = "";
    if (startTimeRef.current) startTimeRef.current.value = "";
    if (endDateRef.current) endDateRef.current.value = "";
    if (endTimeRef.current) endTimeRef.current.value = "";
    if (amountRef.current) amountRef.current.value = "";
    if (newInquiryTitleRef.current) newInquiryTitleRef.current.value = "";
    setError("");
  }

  function submit() {
    const title = titleRef.current?.value ?? "";
    const startDate = startDateRef.current?.value ?? "";
    const startTime = startTimeRef.current?.value ?? "";
    const endDate = endDateRef.current?.value ?? "";
    const endTime = endTimeRef.current?.value ?? "";
    const newInquiryTitle = newInquiryTitleRef.current?.value ?? "";
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

    const startAt = `${startDate}T${startTime}`;
    const endAt = `${endDate}T${endTime}`;

    if (new Date(endAt) <= new Date(startAt)) {
      setError("Die Bis-Zeit muss nach der Von-Zeit liegen.");
      return;
    }
    if (inquiryMode === "new" && !newInquiryTitle.trim()) {
      setError("Bitte einen Titel für die neue Anfrage eingeben.");
      return;
    }
    if (fc("amount").required && !amountRef.current?.value?.trim()) {
      setError("Betrag ist ein Pflichtfeld.");
      return;
    }

    startTransition(async () => {
      let finalInquiryId = inquiryMode === "existing" ? inquiryId : "";

      if (inquiryMode === "new") {
        const created = await createInquiryQuick(customerId, { title: newInquiryTitle });
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
        recurrence:
          recurrence !== "NONE"
            ? { frequency: recurrence, count: Number(recurrenceCount) || 1 }
            : undefined,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      reset();
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2.5 hover:bg-brand-600 transition-colors"
      >
        <Plus size={16} />
        Neuer Termin
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => {
        reset();
        setOpen(false);
      }}
    >
      <div
        className="rounded-card border border-ink-100 bg-surface p-5 shadow-cardHover space-y-3 max-w-xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <label className="block text-xs text-ink-500 mb-1">Kunde</label>
          <CustomerAutocomplete
            customers={customers}
            name="customerId"
            allowCreate
            onSelect={(id) => {
              setCustomerId(id);
              setInquiryId("");
              setInquiryMode("none");
            }}
          />
        </div>

        {customerId && (
          <div>
            <label className="block text-xs text-ink-500 mb-1">Zugehörige Anfrage</label>

            {inquiryMode === "none" && (
              <div className="flex flex-wrap gap-3">
                {relevantInquiries.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setInquiryMode("existing")}
                    className="text-xs text-brand-700 hover:underline"
                  >
                    Bestehende Anfrage wählen
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setInquiryMode("new")}
                  className="text-xs text-brand-700 hover:underline"
                >
                  + Neue Anfrage anlegen
                </button>
              </div>
            )}

            {inquiryMode === "existing" && (
              <div className="flex items-center gap-2">
                <select
                  value={inquiryId}
                  onChange={(e) => setInquiryId(e.target.value)}
                  className="flex-1 rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
                >
                  <option value="">Bitte wählen …</option>
                  {relevantInquiries.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.title}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setInquiryMode("none");
                    setInquiryId("");
                  }}
                  className="text-xs text-ink-500 hover:text-danger transition-colors whitespace-nowrap"
                >
                  Entfernen
                </button>
              </div>
            )}

            {inquiryMode === "new" && (
              <div className="flex items-center gap-2">
                <input
                  ref={newInquiryTitleRef}
                  placeholder="Titel der neuen Anfrage …"
                  className="flex-1 rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
                <button
                  type="button"
                  onClick={() => setInquiryMode("none")}
                  className="text-xs text-ink-500 hover:text-danger transition-colors whitespace-nowrap"
                >
                  Entfernen
                </button>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs text-ink-500 mb-1">Titel</label>
          <input
            ref={titleRef}
            placeholder="z. B. Vor-Ort-Termin Wallbox"
            className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
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

        <div>
          <label className="block text-xs text-ink-500 mb-1">Zuständig</label>
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
        </div>

        <div className="grid grid-cols-2 gap-3">
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-ink-500 mb-1">Wiederholung</label>
            <select
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as typeof recurrence)}
              className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
            >
              <option value="NONE">Keine</option>
              <option value="WEEKLY">Wöchentlich</option>
              <option value="BIWEEKLY">Alle 2 Wochen</option>
              <option value="MONTHLY">Monatlich</option>
            </select>
          </div>
          {recurrence !== "NONE" && (
            <div>
              <label className="block text-xs text-ink-500 mb-1">Anzahl Termine</label>
              <input
                type="number"
                min={2}
                max={26}
                value={recurrenceCount}
                onChange={(e) => setRecurrenceCount(e.target.value)}
                className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 font-mono"
              />
            </div>
          )}
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            disabled={pending}
            onClick={submit}
            className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 disabled:opacity-60 transition-colors"
          >
            {pending ? "Wird gespeichert …" : "Termin speichern"}
          </button>
          <button
            onClick={() => {
              reset();
              setOpen(false);
            }}
            className="rounded-lg border border-ink-100 text-ink-700 text-sm font-medium px-4 py-2 hover:bg-ink-50 transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}
