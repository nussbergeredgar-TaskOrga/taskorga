"use client";

import { useRef, useTransition } from "react";
import { createLinkedTask, toggleLinkedTask, type RecordLink } from "@/lib/actions/notes-and-tasks";

type TaskEntry = { id: string; title: string; status: string; dueDate: Date | null };

export function RecordTasks({ link, tasks }: { link: RecordLink; tasks: TaskEntry[] }) {
  const titleRef = useRef<HTMLInputElement>(null);
  const dueDateRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    const title = titleRef.current?.value ?? "";
    if (!title.trim()) return;
    startTransition(async () => {
      await createLinkedTask(link, { title, dueDate: dueDateRef.current?.value });
      if (titleRef.current) titleRef.current.value = "";
      if (dueDateRef.current) dueDateRef.current.value = "";
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input
          ref={titleRef}
          placeholder="Neue Aufgabe …"
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="flex-1 min-w-[160px] rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        <input
          ref={dueDateRef}
          type="date"
          className="rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        <button
          disabled={pending}
          onClick={submit}
          className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 disabled:opacity-60 transition-colors"
        >
          Hinzufügen
        </button>
      </div>
      <div className="space-y-1.5">
        {tasks.map((t) => (
          <label key={t.id} className="flex items-center gap-2.5 rounded-lg bg-ink-50 px-3 py-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={t.status === "DONE"}
              disabled={pending}
              onChange={(e) => startTransition(() => toggleLinkedTask(t.id, e.target.checked, link))}
              className="accent-brand-500"
            />
            <span className={t.status === "DONE" ? "line-through text-ink-300" : "text-ink-900"}>{t.title}</span>
            {t.dueDate && (
              <span className="text-xs text-ink-300 ml-auto">{t.dueDate.toLocaleDateString("de-DE")}</span>
            )}
          </label>
        ))}
        {tasks.length === 0 && <p className="text-xs text-ink-300">Noch keine Aufgaben.</p>}
      </div>
    </div>
  );
}
