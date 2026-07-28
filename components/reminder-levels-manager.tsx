"use client";

import { useRef, useState, useTransition } from "react";
import { ArrowUp, ArrowDown, Trash2, Plus, ChevronDown } from "lucide-react";
import {
  addReminderLevel,
  updateReminderLevel,
  deleteReminderLevel,
  moveReminderLevel,
} from "@/lib/actions/reminder-levels";
import { PlaceholderTextarea } from "@/components/placeholder-textarea";

type Level = { id: string; label: string; daysAfterDue: number; introText: string | null };

function LevelRow({ level, isFirst, isLast }: { level: Level; isFirst: boolean; isLast: boolean }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(level.label);
  const [days, setDays] = useState(String(level.daysAfterDue));
  const [introText, setIntroText] = useState(level.introText ?? "");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function save() {
    startTransition(async () => {
      await updateReminderLevel(level.id, { label, daysAfterDue: Number(days) || 0, introText });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  }

  return (
    <div className="rounded-lg border border-ink-100 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-ink-50 transition-colors"
      >
        <span className="flex-1 font-medium text-sm text-ink-900 truncate">{label}</span>
        <span className="text-xs text-ink-500 whitespace-nowrap">{days} Tage überfällig</span>
        <ChevronDown size={16} className={`text-ink-300 transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="p-4 pt-0 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <button
                disabled={isFirst || pending}
                onClick={(e) => { e.stopPropagation(); startTransition(() => moveReminderLevel(level.id, "up")); }}
                className="text-ink-300 hover:text-ink-700 disabled:opacity-20 transition-colors"
              >
                <ArrowUp size={14} />
              </button>
              <button
                disabled={isLast || pending}
                onClick={(e) => { e.stopPropagation(); startTransition(() => moveReminderLevel(level.id, "down")); }}
                className="text-ink-300 hover:text-ink-700 disabled:opacity-20 transition-colors"
              >
                <ArrowDown size={14} />
              </button>
            </div>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="flex-1 rounded-lg border border-ink-100 px-3 py-2 text-sm font-medium outline-none focus:border-brand-500 bg-surface"
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <input
                type="number"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="w-16 rounded-lg border border-ink-100 px-2 py-2 text-sm outline-none focus:border-brand-500 bg-surface font-mono"
              />
              <span className="text-xs text-ink-500 whitespace-nowrap">Tage überfällig</span>
            </div>
            <button
              disabled={pending}
              onClick={() => {
                if (confirm(`Mahnstufe „${level.label}“ wirklich löschen?`)) {
                  startTransition(() => deleteReminderLevel(level.id));
                }
              }}
              className="text-ink-300 hover:text-danger transition-colors p-1.5"
            >
              <Trash2 size={15} />
            </button>
          </div>

          <div>
            <label className="block text-xs text-ink-500 mb-1">
              E-Mail-Text – Platzhalter anklicken zum Einfügen
            </label>
            <PlaceholderTextarea
              value={introText}
              onChange={setIntroText}
              placeholder="z. B. wir möchten Sie freundlich daran erinnern, dass Rechnung {{dokument.nummer}} über {{dokument.brutto}} noch offen ist."
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              disabled={pending}
              onClick={save}
              className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 disabled:opacity-60 transition-colors"
            >
              {pending ? "Wird gespeichert …" : "Speichern"}
            </button>
            {saved && <span className="text-sm text-success">Gespeichert.</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export function ReminderLevelsManager({ levels }: { levels: Level[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  function addLevel() {
    const value = inputRef.current?.value ?? "";
    if (!value.trim()) return;
    startTransition(() => addReminderLevel(value));
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-3">
      {levels.map((l, i) => (
        <LevelRow key={l.id} level={l} isFirst={i === 0} isLast={i === levels.length - 1} />
      ))}
      {levels.length === 0 && <p className="text-sm text-ink-500">Noch keine Mahnstufen konfiguriert.</p>}

      <div className="flex gap-2">
        <input
          ref={inputRef}
          placeholder="Neue Mahnstufe hinzufügen …"
          onKeyDown={(e) => e.key === "Enter" && addLevel()}
          className="flex-1 rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
        />
        <button
          disabled={pending}
          onClick={addLevel}
          className="flex items-center gap-1.5 rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 disabled:opacity-60 transition-colors"
        >
          <Plus size={15} />
          Hinzufügen
        </button>
      </div>
    </div>
  );
}
