"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { createDashboard, renameDashboard, deleteDashboard, type DashboardSummary } from "@/lib/actions/dashboard";
import { cn } from "@/lib/utils";

export function DashboardSwitcher({
  dashboards,
  activeId,
}: {
  dashboards: DashboardSummary[];
  activeId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  function submitCreate() {
    if (!newName.trim()) return;
    startTransition(async () => {
      const id = await createDashboard(newName.trim());
      setCreating(false);
      setNewName("");
      router.push(`/heute?dashboard=${id}`);
    });
  }

  function submitRename(id: string) {
    if (!renameValue.trim()) return;
    startTransition(async () => {
      await renameDashboard(id, renameValue.trim());
      setRenamingId(null);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    if (dashboards.length <= 1) return;
    if (!confirm("Dieses Dashboard wirklich löschen?")) return;
    startTransition(async () => {
      await deleteDashboard(id);
      router.push("/heute");
    });
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {dashboards.map((d) => {
        const isActive = d.id === activeId;
        const href = d.id ? `/heute?dashboard=${d.id}` : "/heute";

        if (renamingId === d.id) {
          return (
            <div key={d.id ?? "default"} className="flex items-center gap-1">
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && d.id && submitRename(d.id)}
                className="rounded-lg border border-brand-500 px-2 py-1 text-sm outline-none bg-surface w-32"
              />
              <button
                disabled={pending}
                onClick={() => d.id && submitRename(d.id)}
                className="p-1 text-success hover:opacity-70"
                aria-label="Speichern"
              >
                <Check size={15} />
              </button>
              <button onClick={() => setRenamingId(null)} className="p-1 text-ink-300 hover:text-ink-700" aria-label="Abbrechen">
                <X size={15} />
              </button>
            </div>
          );
        }

        return (
          <div
            key={d.id ?? "default"}
            className={cn(
              "group flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              isActive ? "bg-brand-500 text-white" : "text-ink-700 hover:bg-ink-50"
            )}
          >
            <Link href={href}>{d.name}</Link>
            {isActive && (
              <span className="hidden group-hover:flex items-center gap-0.5 ml-1">
                {d.id && (
                  <button
                    onClick={() => {
                      setRenamingId(d.id);
                      setRenameValue(d.name);
                    }}
                    className="p-0.5 opacity-80 hover:opacity-100"
                    aria-label="Umbenennen"
                  >
                    <Pencil size={12} />
                  </button>
                )}
                {d.id && dashboards.length > 1 && (
                  <button
                    onClick={() => handleDelete(d.id!)}
                    className="p-0.5 opacity-80 hover:opacity-100"
                    aria-label="Löschen"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </span>
            )}
          </div>
        );
      })}

      {creating ? (
        <div className="flex items-center gap-1">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitCreate()}
            placeholder="Name des Dashboards"
            className="rounded-lg border border-brand-500 px-2 py-1 text-sm outline-none bg-surface w-36"
          />
          <button disabled={pending} onClick={submitCreate} className="p-1 text-success hover:opacity-70" aria-label="Erstellen">
            <Check size={15} />
          </button>
          <button onClick={() => setCreating(false)} className="p-1 text-ink-300 hover:text-ink-700" aria-label="Abbrechen">
            <X size={15} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-ink-500 hover:bg-ink-50 hover:text-ink-900 transition-colors"
        >
          <Plus size={14} />
          Neu
        </button>
      )}
    </div>
  );
}
