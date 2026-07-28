"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { saveWorkingHours, createAbsence, deleteAbsence } from "@/lib/actions/schedule";

const WEEKDAY_LABELS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const ABSENCE_LABELS: Record<string, string> = { URLAUB: "Urlaub", FREI: "Frei", FEIERTAG: "Feiertag" };

type WorkingHourRow = { weekday: number; startTime: string; endTime: string; isWorkingDay: boolean };
type Absence = {
  id: string;
  userId: string | null;
  type: string;
  startDate: Date;
  endDate: Date;
  note: string | null;
  user: { name: string } | null;
};

export function ScheduleManager({
  users,
  initialUserId,
  initialWorkingHours,
  absences,
}: {
  users: { id: string; name: string }[];
  initialUserId: string;
  initialWorkingHours: WorkingHourRow[];
  absences: Absence[];
}) {
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState(initialUserId);
  const [hours, setHours] = useState<WorkingHourRow[]>(initialWorkingHours);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [absenceType, setAbsenceType] = useState<"URLAUB" | "FREI" | "FEIERTAG">("URLAUB");
  const [absenceUserId, setAbsenceUserId] = useState(initialUserId);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");

  function updateHour(weekday: number, patch: Partial<WorkingHourRow>) {
    setHours((prev) => prev.map((h) => (h.weekday === weekday ? { ...h, ...patch } : h)));
  }

  function saveHours() {
    startTransition(async () => {
      await saveWorkingHours(selectedUserId, hours);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  function addAbsence() {
    if (!startDate || !endDate) return;
    startTransition(async () => {
      await createAbsence({
        userId: absenceType === "FEIERTAG" ? undefined : absenceUserId,
        type: absenceType,
        startDate,
        endDate,
        note,
      });
      setStartDate("");
      setEndDate("");
      setNote("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-xs text-ink-500 mb-1">Nutzer auswählen</label>
        <select
          value={selectedUserId}
          onChange={async (e) => {
            const uid = e.target.value;
            setSelectedUserId(uid);
            router.push(`/einstellungen/firma?scheduleUser=${uid}#arbeitszeiten`);
          }}
          className="w-full max-w-xs rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
        >
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {hours.map((h) => (
          <div key={h.weekday} className="grid grid-cols-[110px,auto,1fr,1fr] items-center gap-2 text-sm">
            <span className="text-ink-900">{WEEKDAY_LABELS[h.weekday]}</span>
            <label className="flex items-center gap-1.5 text-xs text-ink-500">
              <input
                type="checkbox"
                checked={h.isWorkingDay}
                onChange={(e) => updateHour(h.weekday, { isWorkingDay: e.target.checked })}
                className="accent-brand-500"
              />
              Arbeitstag
            </label>
            <input
              type="time"
              value={h.startTime}
              disabled={!h.isWorkingDay}
              onChange={(e) => updateHour(h.weekday, { startTime: e.target.value })}
              className="rounded-lg border border-ink-100 px-2 py-1.5 text-sm outline-none focus:border-brand-500 disabled:opacity-40"
            />
            <input
              type="time"
              value={h.endTime}
              disabled={!h.isWorkingDay}
              onChange={(e) => updateHour(h.weekday, { endTime: e.target.value })}
              className="rounded-lg border border-ink-100 px-2 py-1.5 text-sm outline-none focus:border-brand-500 disabled:opacity-40"
            />
          </div>
        ))}
        <div className="flex items-center gap-3 pt-1">
          <button
            disabled={pending}
            onClick={saveHours}
            className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 disabled:opacity-60 transition-colors"
          >
            {pending ? "Wird gespeichert …" : "Arbeitszeiten speichern"}
          </button>
          {saved && <span className="text-sm text-success">Gespeichert.</span>}
        </div>
      </div>

      <div className="border-t border-ink-100 pt-5 space-y-3">
        <p className="text-xs font-medium text-ink-700">Urlaub / Frei / Feiertag eintragen</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <select
            value={absenceType}
            onChange={(e) => setAbsenceType(e.target.value as any)}
            className="rounded-lg border border-ink-100 px-3 py-2 text-sm bg-surface outline-none focus:border-brand-500"
          >
            <option value="URLAUB">Urlaub</option>
            <option value="FREI">Frei</option>
            <option value="FEIERTAG">Feiertag (firmenweit)</option>
          </select>
          {absenceType !== "FEIERTAG" && (
            <select
              value={absenceUserId}
              onChange={(e) => setAbsenceUserId(e.target.value)}
              className="rounded-lg border border-ink-100 px-3 py-2 text-sm bg-surface outline-none focus:border-brand-500"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        </div>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Notiz (optional)"
          className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        <button
          disabled={pending}
          onClick={addAbsence}
          className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 disabled:opacity-60 transition-colors"
        >
          Eintragen
        </button>

        <div className="space-y-1.5 pt-2">
          {absences.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2 text-sm">
              <span>
                <span className="font-medium text-ink-900">{ABSENCE_LABELS[a.type]}</span>
                {a.user && <span className="text-ink-500"> · {a.user.name}</span>}
                <span className="text-ink-500 ml-2 font-mono text-xs">
                  {new Date(a.startDate).toLocaleDateString("de-DE")} – {new Date(a.endDate).toLocaleDateString("de-DE")}
                </span>
                {a.note && <span className="text-ink-500 ml-2">— {a.note}</span>}
              </span>
              <button
                disabled={pending}
                onClick={() => startTransition(async () => { await deleteAbsence(a.id); router.refresh(); })}
                className="text-ink-300 hover:text-danger transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {absences.length === 0 && <p className="text-xs text-ink-300">Noch keine Einträge.</p>}
        </div>
      </div>
    </div>
  );
}
