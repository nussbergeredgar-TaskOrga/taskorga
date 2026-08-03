"use client";

import { useState, useTransition } from "react";
import { updateProjectStatus, createInvoiceFromProject, cancelProject } from "@/lib/actions/projects";
import type { ProjectStatus } from "@prisma/client";

export function ProjectActions({
  projectId,
  status,
  cancelReason,
}: {
  projectId: string;
  status: ProjectStatus;
  cancelReason?: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function cancel() {
    const reason = prompt("Auftrag stornieren. Grund (optional):");
    if (reason === null) return;
    setError("");
    startTransition(async () => {
      const result = await cancelProject(projectId, reason);
      if (result?.error) setError(result.error);
    });
  }

  if (status === "CANCELLED") {
    return (
      <div>
        <p className="text-sm text-danger font-medium">Storniert</p>
        {cancelReason && <p className="text-sm text-ink-500 mt-0.5">Grund: {cancelReason}</p>}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {status === "PLANNED" && (
          <button
            disabled={pending}
            onClick={() => startTransition(() => updateProjectStatus(projectId, "IN_PROGRESS"))}
            className="rounded-lg border border-ink-100 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 transition-colors"
          >
            Auftrag starten
          </button>
        )}
        {status === "IN_PROGRESS" && (
          <button
            disabled={pending}
            onClick={() => startTransition(() => updateProjectStatus(projectId, "DONE"))}
            className="rounded-lg border border-ink-100 px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 transition-colors"
          >
            Als abgeschlossen markieren
          </button>
        )}
        <button
          disabled={pending}
          onClick={() => startTransition(() => createInvoiceFromProject(projectId))}
          className="rounded-lg bg-brand-500 text-white px-3 py-2 text-sm font-medium hover:bg-brand-600 transition-colors disabled:opacity-60"
        >
          Rechnung erstellen
        </button>
        <button
          disabled={pending}
          onClick={cancel}
          className="rounded-lg border border-danger text-danger px-3 py-2 text-sm font-medium hover:bg-danger/5 transition-colors disabled:opacity-60"
        >
          Stornieren
        </button>
      </div>
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}
