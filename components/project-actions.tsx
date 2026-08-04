"use client";

import { useState, useTransition } from "react";
import { updateProjectStatus, createInvoiceFromProject, cancelProject } from "@/lib/actions/projects";
import type { ProjectStatus } from "@prisma/client";

type QuoteItem = {
  position: number;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
};

export function ProjectActions({
  projectId,
  status,
  cancelReason,
  existingInvoiceCount,
  quoteItems,
}: {
  projectId: string;
  status: ProjectStatus;
  cancelReason?: string | null;
  existingInvoiceCount: number;
  quoteItems: QuoteItem[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [invoicePanelOpen, setInvoicePanelOpen] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set(quoteItems.map((i) => i.position)));

  function cancel() {
    const reason = prompt("Auftrag stornieren. Grund (optional):");
    if (reason === null) return;
    setError("");
    startTransition(async () => {
      const result = await cancelProject(projectId, reason);
      if (result?.error) setError(result.error);
    });
  }

  function toggleItem(position: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(position)) next.delete(position);
      else next.add(position);
      return next;
    });
  }

  function createInvoice() {
    setError("");
    startTransition(async () => {
      const result = await createInvoiceFromProject(
        projectId,
        quoteItems.length > 0 ? Array.from(selected) : undefined
      );
      if (result?.error) setError(result.error);
    });
  }

  function openInvoicePanel() {
    if (quoteItems.length === 0) {
      // Kein Angebot verknüpft -- nichts auszuwählen, direkt anlegen.
      if (
        existingInvoiceCount > 0 &&
        !confirm(
          `Für diesen Auftrag ${existingInvoiceCount === 1 ? "existiert bereits eine Rechnung" : `existieren bereits ${existingInvoiceCount} Rechnungen`}. Trotzdem eine weitere erstellen?`
        )
      ) {
        return;
      }
      createInvoice();
      return;
    }
    setError("");
    setInvoicePanelOpen(true);
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
          onClick={openInvoicePanel}
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

      {invoicePanelOpen && (
        <div className="mt-3 rounded-lg border border-ink-100 bg-surface p-4 space-y-3 max-w-md">
          {existingInvoiceCount > 0 && (
            <p className="text-xs text-warning bg-warning/10 rounded-lg px-3 py-2">
              Für diesen Auftrag {existingInvoiceCount === 1 ? "existiert bereits eine Rechnung" : `existieren bereits ${existingInvoiceCount} Rechnungen`}.
              Bitte prüfen, ob die ausgewählten Positionen nicht schon abgerechnet wurden.
            </p>
          )}
          <p className="text-sm font-medium text-ink-900">Welche Positionen abrechnen?</p>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {quoteItems.map((item) => (
              <label
                key={item.position}
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-ink-50 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.has(item.position)}
                  onChange={() => toggleItem(item.position)}
                  className="rounded accent-brand-500 shrink-0"
                />
                <span className="text-ink-900 truncate">{item.description}</span>
                <span className="text-xs text-ink-500 ml-auto shrink-0 font-mono">
                  {item.quantity} {item.unit} × {item.unitPrice.toLocaleString("de-DE")} €
                </span>
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              disabled={pending || selected.size === 0}
              onClick={createInvoice}
              className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 disabled:opacity-60 transition-colors"
            >
              {pending ? "Wird erstellt …" : `${selected.size} Position${selected.size !== 1 ? "en" : ""} abrechnen`}
            </button>
            <button
              disabled={pending}
              onClick={() => setInvoicePanelOpen(false)}
              className="rounded-lg border border-ink-100 text-ink-700 text-sm font-medium px-4 py-2 hover:bg-ink-50 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
