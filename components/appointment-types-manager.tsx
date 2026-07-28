"use client";

import { useRef, useState, useTransition } from "react";
import { ArrowUp, ArrowDown, Trash2, Plus } from "lucide-react";
import {
  addAppointmentType,
  renameAppointmentType,
  deleteAppointmentType,
  moveAppointmentType,
} from "@/lib/actions/appointment-types";

type AppointmentTypeItem = { id: string; label: string };

export function AppointmentTypesManager({ types }: { types: AppointmentTypeItem[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [editValues, setEditValues] = useState<Record<string, string>>(
    Object.fromEntries(types.map((t) => [t.id, t.label]))
  );

  function addType() {
    const value = inputRef.current?.value ?? "";
    if (!value.trim()) return;
    startTransition(() => addAppointmentType(value));
    if (inputRef.current) inputRef.current.value = "";
  }

  function saveRename(id: string) {
    const value = editValues[id];
    const original = types.find((t) => t.id === id)?.label;
    if (value && value !== original) {
      startTransition(() => renameAppointmentType(id, value));
    }
  }

  return (
    <div className="space-y-3">
      {types.map((t, i) => (
        <div key={t.id} className="flex items-center gap-2">
          <div className="flex flex-col">
            <button
              disabled={i === 0 || pending}
              onClick={() => startTransition(() => moveAppointmentType(t.id, "up"))}
              className="text-ink-300 hover:text-ink-700 disabled:opacity-20 transition-colors"
            >
              <ArrowUp size={13} />
            </button>
            <button
              disabled={i === types.length - 1 || pending}
              onClick={() => startTransition(() => moveAppointmentType(t.id, "down"))}
              className="text-ink-300 hover:text-ink-700 disabled:opacity-20 transition-colors"
            >
              <ArrowDown size={13} />
            </button>
          </div>
          <input
            value={editValues[t.id] ?? t.label}
            onChange={(e) => setEditValues((prev) => ({ ...prev, [t.id]: e.target.value }))}
            onBlur={() => saveRename(t.id)}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            className="flex-1 rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
          />
          <button
            disabled={pending}
            onClick={() => {
              if (confirm(`Terminart „${t.label}“ wirklich löschen?`)) {
                startTransition(() => deleteAppointmentType(t.id));
              }
            }}
            className="p-1.5 text-ink-300 hover:text-danger transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      {types.length === 0 && <p className="text-sm text-ink-500">Noch keine Terminarten angelegt.</p>}

      <div className="flex gap-2 pt-1">
        <input
          ref={inputRef}
          placeholder="Neue Terminart hinzufügen …"
          onKeyDown={(e) => e.key === "Enter" && addType()}
          className="flex-1 rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
        />
        <button
          disabled={pending}
          onClick={addType}
          className="flex items-center gap-1.5 rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 disabled:opacity-60 transition-colors"
        >
          <Plus size={15} />
          Hinzufügen
        </button>
      </div>
    </div>
  );
}
