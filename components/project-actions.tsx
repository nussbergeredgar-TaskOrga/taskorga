"use client";

import { useTransition } from "react";
import { updateProjectStatus, createInvoiceFromProject } from "@/lib/actions/projects";
import type { ProjectStatus } from "@prisma/client";

export function ProjectActions({ projectId, status }: { projectId: string; status: ProjectStatus }) {
  const [pending, startTransition] = useTransition();

  return (
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
    </div>
  );
}
