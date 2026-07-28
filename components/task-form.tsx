"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createFreeTask, updateFreeTask, type FreeTaskInput } from "@/lib/actions/free-tasks";
import { CustomerAutocomplete } from "@/components/customer-autocomplete";
import type { TaskPriority } from "@prisma/client";

type LinkType = "inquiryId" | "quoteId" | "projectId" | "invoiceId" | "appointmentId";

const LINK_TYPE_LABELS: Record<LinkType, string> = {
  inquiryId: "Anfrage",
  quoteId: "Angebot",
  projectId: "Auftrag",
  invoiceId: "Rechnung",
  appointmentId: "Termin",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Niedrig",
  NORMAL: "Normal",
  HIGH: "Hoch",
  URGENT: "Dringend",
};

export type LinkableRecord = { id: string; label: string; customerId: string | null };

export function TaskForm({
  taskId,
  initial,
  users,
  customers,
  linkables,
  onDone,
}: {
  taskId?: string;
  initial?: {
    title: string;
    description: string | null;
    dueDate: Date | null;
    priority: TaskPriority;
    assigneeId: string | null;
    customerId: string | null;
    linkType?: LinkType;
    linkId?: string;
  };
  users: { id: string; name: string }[];
  customers: { id: string; name: string }[];
  linkables: Record<LinkType, LinkableRecord[]>;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [dueDate, setDueDate] = useState(initial?.dueDate ? new Date(initial.dueDate).toISOString().slice(0, 10) : "");
  const [priority, setPriority] = useState<TaskPriority>(initial?.priority ?? "NORMAL");
  const [assigneeId, setAssigneeId] = useState(initial?.assigneeId ?? "");
  const [customerId, setCustomerId] = useState(initial?.customerId ?? "");
  const [linkType, setLinkType] = useState<LinkType | "">(initial?.linkType ?? "");
  const [linkId, setLinkId] = useState(initial?.linkId ?? "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const availableLinkRecords = useMemo(() => {
    if (!linkType) return [];
    const all = linkables[linkType] ?? [];
    if (!customerId) return all;
    return all.filter((r) => r.customerId === customerId);
  }, [linkType, customerId, linkables]);

  function submit() {
    if (!title.trim()) {
      setError("Bitte einen Titel eingeben.");
      return;
    }
    setError("");

    const payload: FreeTaskInput = {
      title,
      description,
      dueDate,
      priority,
      assigneeId,
      customerId,
      linkType: linkType || undefined,
      linkId: linkType ? linkId : undefined,
    };

    startTransition(async () => {
      if (taskId) {
        const result = await updateFreeTask(taskId, payload);
        if (result?.error) {
          setError(result.error);
          return;
        }
        if (onDone) onDone();
        else router.refresh();
      } else {
        const result = await createFreeTask(payload);
        if (result?.error) {
          setError(result.error);
          return;
        }
        if (onDone) onDone();
        else if (result.id) router.push(`/aufgaben/${result.id}`);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-ink-500 mb-1">Titel</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="z. B. Angebot nachfassen"
          className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
      </div>

      <div>
        <label className="block text-xs text-ink-500 mb-1">Beschreibung (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-ink-500 mb-1">Fällig am</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        </div>
        <div>
          <label className="block text-xs text-ink-500 mb-1">Priorität</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
          >
            {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs text-ink-500 mb-1">Zugewiesen an (optional)</label>
        <select
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
        >
          <option value="">Niemand</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-ink-500 mb-1">Kunde (optional)</label>
        <CustomerAutocomplete
          customers={customers}
          name="customerId"
          defaultCustomerId={customerId || undefined}
          allowCreate
          onSelect={(id) => {
            setCustomerId(id);
            setLinkId("");
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-ink-500 mb-1">Verknüpfter Datensatz (optional)</label>
          <select
            value={linkType}
            onChange={(e) => {
              setLinkType(e.target.value as LinkType | "");
              setLinkId("");
            }}
            className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
          >
            <option value="">Keiner</option>
            {(Object.keys(LINK_TYPE_LABELS) as LinkType[]).map((t) => (
              <option key={t} value={t}>
                {LINK_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        {linkType && (
          <div>
            <label className="block text-xs text-ink-500 mb-1">{LINK_TYPE_LABELS[linkType]} wählen</label>
            <select
              value={linkId}
              onChange={(e) => setLinkId(e.target.value)}
              className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface"
            >
              <option value="">Bitte wählen …</option>
              {availableLinkRecords.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          disabled={pending}
          onClick={submit}
          className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 disabled:opacity-60 transition-colors"
        >
          {pending ? "Wird gespeichert …" : taskId ? "Änderungen speichern" : "Aufgabe anlegen"}
        </button>
        {onDone && (
          <button
            onClick={onDone}
            className="rounded-lg border border-ink-100 text-ink-700 text-sm font-medium px-4 py-2 hover:bg-ink-50 transition-colors"
          >
            Abbrechen
          </button>
        )}
      </div>
    </div>
  );
}
