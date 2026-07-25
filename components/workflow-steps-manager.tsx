"use client";

import { useRef, useState, useTransition } from "react";
import { ArrowUp, ArrowDown, Trash2, Plus } from "lucide-react";
import {
  addWorkflowStep,
  renameWorkflowStep,
  deleteWorkflowStep,
  moveWorkflowStep,
} from "@/lib/actions/workflow";

type Step = { id: string; label: string; order: number };

function StepRow({ step, isFirst, isLast }: { step: Step; isFirst: boolean; isLast: boolean }) {
  const [label, setLabel] = useState(step.label);
  const [pending, startTransition] = useTransition();

  function saveLabel() {
    if (label.trim() && label !== step.label) {
      startTransition(() => renameWorkflowStep(step.id, label));
    }
  }

  return (
    <div className="flex items-center gap-2 py-2 border-b border-ink-100 last:border-0">
      <div className="flex flex-col">
        <button
          disabled={isFirst || pending}
          onClick={() => startTransition(() => moveWorkflowStep(step.id, "up"))}
          className="text-ink-300 hover:text-ink-700 disabled:opacity-20 transition-colors"
          aria-label="Nach oben"
        >
          <ArrowUp size={14} />
        </button>
        <button
          disabled={isLast || pending}
          onClick={() => startTransition(() => moveWorkflowStep(step.id, "down"))}
          className="text-ink-300 hover:text-ink-700 disabled:opacity-20 transition-colors"
          aria-label="Nach unten"
        >
          <ArrowDown size={14} />
        </button>
      </div>
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={saveLabel}
        disabled={pending}
        className="flex-1 rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
      />
      <button
        disabled={pending}
        onClick={() => {
          if (confirm(`Schritt „${step.label}“ wirklich löschen? Dokumentierte Notizen dazu gehen verloren.`)) {
            startTransition(() => deleteWorkflowStep(step.id));
          }
        }}
        className="text-ink-300 hover:text-danger transition-colors p-2"
        aria-label="Löschen"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

export function WorkflowStepsManager({ steps }: { steps: Step[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  function addStep() {
    const value = inputRef.current?.value ?? "";
    if (!value.trim()) return;
    startTransition(() => addWorkflowStep(value));
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <div>
        {steps.map((step, i) => (
          <StepRow key={step.id} step={step} isFirst={i === 0} isLast={i === steps.length - 1} />
        ))}
        {steps.length === 0 && (
          <p className="text-sm text-ink-500 py-2">Noch keine Schritte konfiguriert.</p>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        <input
          ref={inputRef}
          placeholder="Neuen Schritt hinzufügen …"
          onKeyDown={(e) => e.key === "Enter" && addStep()}
          className="flex-1 rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        <button
          disabled={pending}
          onClick={addStep}
          className="flex items-center gap-1.5 rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 disabled:opacity-60 transition-colors"
        >
          <Plus size={15} />
          Hinzufügen
        </button>
      </div>
    </div>
  );
}
