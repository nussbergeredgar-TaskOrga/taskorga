"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { toggleStepEntry, updateStepEntry } from "@/lib/actions/workflow";
import { cn } from "@/lib/utils";

type Step = { id: string; label: string; order: number };
type Entry = { stepId: string; note: string | null; completedAt: Date | null };

// Für <input type="datetime-local">: lokale Zeit im Format YYYY-MM-DDTHH:mm
function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function StepRow({
  inquiryId,
  step,
  entry,
  isLast,
}: {
  inquiryId: string;
  step: Step;
  entry?: Entry;
  isLast: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState(entry?.note ?? "");
  const done = !!entry?.completedAt;

  function toggle() {
    startTransition(() => toggleStepEntry(inquiryId, step.id, !done));
  }

  function saveNote() {
    if (note === (entry?.note ?? "")) return;
    startTransition(() => updateStepEntry(inquiryId, step.id, { note }));
  }

  function changeDateTime(value: string) {
    startTransition(() => updateStepEntry(inquiryId, step.id, { completedAt: value || null }));
  }

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <button
          onClick={toggle}
          disabled={pending}
          aria-label={done ? "Als offen markieren" : "Als erledigt markieren"}
          className={cn(
            "flex items-center justify-center h-7 w-7 rounded-full border-2 shrink-0 transition-colors",
            done ? "bg-success border-success text-white" : "border-ink-300 text-transparent hover:border-brand-500"
          )}
        >
          <Check size={16} strokeWidth={3} />
        </button>
        {!isLast && <div className={cn("w-0.5 flex-1 mt-1", done ? "bg-success" : "bg-ink-100")} />}
      </div>

      <div className="flex-1 pb-6">
        <p className={cn("text-sm font-medium", done ? "text-ink-900" : "text-ink-700")}>
          {step.label}
        </p>

        <div className="mt-2 space-y-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={saveNote}
            placeholder="Notiz zu diesem Schritt …"
            rows={2}
            className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 resize-none"
          />
          {done && (
            <input
              type="datetime-local"
              defaultValue={entry?.completedAt ? toLocalInputValue(new Date(entry.completedAt)) : ""}
              onChange={(e) => changeDateTime(e.target.value)}
              className="rounded-lg border border-ink-100 px-3 py-1.5 text-xs outline-none focus:border-brand-500 font-mono"
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function InquiryWorkflow({
  inquiryId,
  steps,
  entries,
}: {
  inquiryId: string;
  steps: Step[];
  entries: Entry[];
}) {
  const entryByStep = new Map(entries.map((e) => [e.stepId, e]));

  if (steps.length === 0) {
    return (
      <p className="text-sm text-ink-500">
        Noch keine Workflow-Schritte konfiguriert. Unter Einstellungen → Anfragen-Workflow einrichten.
      </p>
    );
  }

  return (
    <div>
      {steps.map((step, i) => (
        <StepRow
          key={step.id}
          inquiryId={inquiryId}
          step={step}
          entry={entryByStep.get(step.id)}
          isLast={i === steps.length - 1}
        />
      ))}
    </div>
  );
}
