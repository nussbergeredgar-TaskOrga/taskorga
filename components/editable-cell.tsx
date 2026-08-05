"use client";

import { useEffect, useRef, useState, useTransition } from "react";

// Generische, direkt in der Listenansicht editierbare Tabellenzelle --
// Text per Klick editieren (Enter speichert, Escape verwirft) oder Auswahl
// per Dropdown. Die eigentliche Speicherung passiert ueber die vom
// aufrufenden Modul uebergebene onSave-Funktion (z.B. updateCustomerField).
export function EditableCell({
  recordId,
  field,
  value,
  type = "text",
  options,
  onSave,
}: {
  recordId: string;
  field: string;
  value: string;
  type?: "text" | "select";
  options?: { value: string; label: string }[];
  onSave: (recordId: string, field: string, value: string) => Promise<{ error?: string } | void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setDraft(value), [value]);

  function save() {
    if (draft === value) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const result = await onSave(recordId, field, draft);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setError("");
      setEditing(false);
    });
  }

  if (type === "select") {
    return (
      <select
        value={value}
        disabled={pending}
        onClick={(e) => e.preventDefault()}
        onChange={(e) => {
          startTransition(async () => {
            await onSave(recordId, field, e.target.value);
          });
        }}
        className="w-full bg-transparent text-sm outline-none cursor-pointer"
      >
        {options?.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  if (!editing) {
    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          setEditing(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="w-full text-left text-sm text-ink-700 truncate hover:bg-ink-50 rounded px-1 -mx-1 py-0.5 transition-colors"
        title="Zum Bearbeiten klicken"
      >
        {value || <span className="text-ink-300">—</span>}
      </button>
    );
  }

  return (
    <div onClick={(e) => e.preventDefault()}>
      <input
        ref={inputRef}
        value={draft}
        disabled={pending}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className="w-full rounded border border-brand-500 px-1 py-0.5 text-sm outline-none bg-surface"
      />
      {error && <p className="text-[11px] text-danger mt-0.5">{error}</p>}
    </div>
  );
}
