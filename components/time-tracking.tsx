"use client";

import { useRef, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { createTimeEntry, deleteTimeEntry } from "@/lib/actions/time-entries";

type Entry = {
  id: string;
  date: Date;
  minutes: number;
  description: string | null;
  userId: string;
  user: { name: string };
};

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} Min.`;
  if (m === 0) return `${h} Std.`;
  return `${h} Std. ${m} Min.`;
}

export function TimeTracking({
  projectId,
  entries,
  currentUserId,
}: {
  projectId: string;
  entries: Entry[];
  currentUserId: string;
}) {
  const dateRef = useRef<HTMLInputElement>(null);
  const hoursRef = useRef<HTMLInputElement>(null);
  const minutesRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const totalMinutes = entries.reduce((sum, e) => sum + e.minutes, 0);

  function submit() {
    const date = dateRef.current?.value;
    const hours = Number(hoursRef.current?.value || 0);
    const mins = Number(minutesRef.current?.value || 0);
    const totalMins = hours * 60 + mins;
    setError("");

    if (!date) {
      setError("Bitte ein Datum wählen.");
      return;
    }
    if (totalMins <= 0) {
      setError("Bitte eine Dauer größer als 0 angeben.");
      return;
    }

    startTransition(async () => {
      await createTimeEntry(projectId, {
        date,
        minutes: totalMins,
        description: descRef.current?.value,
      });
      if (hoursRef.current) hoursRef.current.value = "";
      if (minutesRef.current) minutesRef.current.value = "";
      if (descRef.current) descRef.current.value = "";
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-ink-900">Zeiterfassung</h2>
        <span className="font-mono text-sm text-ink-500">{formatDuration(totalMinutes)} gesamt</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <input
          ref={dateRef}
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="col-span-2 sm:col-span-1 rounded-lg border border-ink-100 px-2.5 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
        />
        <input
          ref={hoursRef}
          type="number"
          min={0}
          placeholder="Std."
          className="rounded-lg border border-ink-100 px-2.5 py-2 text-sm outline-none focus:border-brand-500 bg-surface font-mono"
        />
        <input
          ref={minutesRef}
          type="number"
          min={0}
          max={59}
          placeholder="Min."
          className="rounded-lg border border-ink-100 px-2.5 py-2 text-sm outline-none focus:border-brand-500 bg-surface font-mono"
        />
        <input
          ref={descRef}
          placeholder="Notiz (optional)"
          className="col-span-2 sm:col-span-1 rounded-lg border border-ink-100 px-2.5 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
        />
        <button
          disabled={pending}
          onClick={submit}
          className="rounded-lg bg-brand-500 text-white text-sm font-medium px-3 py-2 hover:bg-brand-600 disabled:opacity-60 transition-colors"
        >
          Erfassen
        </button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="space-y-1.5">
        {entries.map((e) => (
          <div key={e.id} className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2 text-sm">
            <div className="min-w-0">
              <span className="font-mono text-ink-900">{formatDuration(e.minutes)}</span>
              <span className="text-ink-500 ml-2">{e.date.toLocaleDateString("de-DE")}</span>
              <span className="text-ink-500 ml-2">· {e.user.name}</span>
              {e.description && <span className="text-ink-500 ml-2">— {e.description}</span>}
            </div>
            {e.userId === currentUserId && (
              <button
                disabled={pending}
                onClick={() => startTransition(() => deleteTimeEntry(e.id, projectId))}
                className="text-ink-300 hover:text-danger transition-colors p-1 shrink-0"
                aria-label="Löschen"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
        {entries.length === 0 && <p className="text-xs text-ink-300">Noch keine Zeit erfasst.</p>}
      </div>
    </div>
  );
}
