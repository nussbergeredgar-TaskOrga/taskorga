"use client";

import { useRef, useTransition } from "react";
import { addRecordNote, type RecordLink } from "@/lib/actions/notes-and-tasks";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

type NoteEntry = { id: string; content: string; createdAt: Date; user: { name: string } };

export function RecordNotes({ link, notes }: { link: RecordLink; notes: NoteEntry[] }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    const value = ref.current?.value ?? "";
    if (!value.trim()) return;
    startTransition(async () => {
      await addRecordNote(link, value);
      if (ref.current) ref.current.value = "";
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <textarea
          ref={ref}
          rows={2}
          placeholder="Notiz hinzufügen …"
          className="flex-1 rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 transition-colors resize-none"
        />
        <button
          disabled={pending}
          onClick={submit}
          className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 h-fit hover:bg-brand-600 disabled:opacity-60 transition-colors"
        >
          {pending ? "…" : "Speichern"}
        </button>
      </div>
      <div className="space-y-2">
        {notes.map((n) => (
          <div key={n.id} className="text-sm border-l-2 border-ink-100 pl-3">
            <p className="text-ink-900">{n.content}</p>
            <p className="text-xs text-ink-300 mt-0.5">
              {n.user.name} · {formatDistanceToNow(n.createdAt, { addSuffix: true, locale: de })}
            </p>
          </div>
        ))}
        {notes.length === 0 && <p className="text-xs text-ink-300">Noch keine Notizen.</p>}
      </div>
    </div>
  );
}
