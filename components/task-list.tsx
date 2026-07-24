"use client";

import { useRef, useTransition } from "react";
import { addProjectTask, toggleTask } from "@/lib/actions/projects";

type Task = { id: string; title: string; status: string };

export function TaskList({ projectId, tasks }: { projectId: string; tasks: Task[] }) {
  const ref = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          ref={ref}
          placeholder="Neue Aufgabe …"
          className="flex-1 rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
          onKeyDown={(e) => {
            if (e.key === "Enter" && ref.current?.value.trim()) {
              const value = ref.current.value;
              startTransition(async () => {
                await addProjectTask(projectId, value);
                if (ref.current) ref.current.value = "";
              });
            }
          }}
        />
      </div>
      <div className="space-y-1.5">
        {tasks.map((task) => (
          <label
            key={task.id}
            className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-ink-50 text-sm cursor-pointer"
          >
            <input
              type="checkbox"
              defaultChecked={task.status === "DONE"}
              disabled={pending}
              onChange={(e) => startTransition(() => toggleTask(task.id, e.target.checked))}
              className="rounded accent-brand-500"
            />
            <span className={task.status === "DONE" ? "line-through text-ink-300" : "text-ink-900"}>
              {task.title}
            </span>
          </label>
        ))}
        {tasks.length === 0 && (
          <p className="text-xs text-ink-300 px-2">Noch keine Aufgaben.</p>
        )}
      </div>
    </div>
  );
}
