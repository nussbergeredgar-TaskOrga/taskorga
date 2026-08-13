"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Pencil, Trash2, Check, X, Star } from "lucide-react";
import {
  createDashboard,
  renameDashboard,
  deleteDashboard,
  setDefaultDashboard,
  type DashboardSummary,
} from "@/lib/actions/dashboard";

export function DashboardSwitcher({
  dashboards,
  activeId,
}: {
  dashboards: DashboardSummary[];
  activeId: string | null;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const active = dashboards.find((d) => d.id === activeId) ?? dashboards[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
        setRenamingId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function switchTo(id: string | null) {
    setOpen(false);
    router.push(id ? `/heute?dashboard=${id}` : "/heute");
  }

  function submitCreate() {
    if (!newName.trim()) return;
    startTransition(async () => {
      const id = await createDashboard(newName.trim());
      setCreating(false);
      setNewName("");
      setOpen(false);
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

  function handleSetDefault(id: string) {
    startTransition(async () => {
      await setDefaultDashboard(id);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    if (dashboards.length <= 1) return;
    if (!confirm("Dieses Dashboard wirklich löschen?")) return;
    startTransition(async () => {
      await deleteDashboard(id);
      setOpen(false);
      router.push("/heute");
    });
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-ink-100 bg-surface px-3 py-1.5 text-sm font-medium text-ink-900 hover:bg-ink-50 transition-colors"
      >
        {active?.name ?? "Mein Dashboard"}
        <ChevronDown size={15} className={`text-ink-300 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 mt-1 w-64 rounded-lg border border-ink-100 bg-surface shadow-cardHover py-1.5 z-30">
          {dashboards.map((d) => {
            const isActive = d.id === activeId;

            if (renamingId === d.id) {
              return (
                <div key={d.id ?? "default"} className="flex items-center gap-1 px-2.5 py-1">
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && d.id && submitRename(d.id)}
                    className="flex-1 rounded-lg border border-brand-500 px-2 py-1 text-sm outline-none bg-surface min-w-0"
                  />
                  <button
                    disabled={pending}
                    onClick={() => d.id && submitRename(d.id)}
                    className="p-1 text-success hover:opacity-70 shrink-0"
                    aria-label="Speichern"
                  >
                    <Check size={15} />
                  </button>
                  <button
                    onClick={() => setRenamingId(null)}
                    className="p-1 text-ink-300 hover:text-ink-700 shrink-0"
                    aria-label="Abbrechen"
                  >
                    <X size={15} />
                  </button>
                </div>
              );
            }

            return (
              <div
                key={d.id ?? "default"}
                className={`group flex items-center gap-1 px-2.5 py-2 text-sm transition-colors ${
                  isActive ? "bg-brand-50 text-brand-700 font-medium" : "text-ink-700 hover:bg-ink-50"
                }`}
              >
                <button onClick={() => switchTo(d.id)} className="flex-1 text-left truncate">
                  {d.name}
                </button>
                {d.id && (
                  <button
                    onClick={() => handleSetDefault(d.id!)}
                    disabled={d.isDefault}
                    className={`p-1 shrink-0 transition-colors ${
                      d.isDefault
                        ? "text-warning"
                        : "text-ink-200 opacity-0 group-hover:opacity-100 hover:text-warning"
                    }`}
                    aria-label={d.isDefault ? "Standard-Dashboard" : "Als Standard-Dashboard festlegen"}
                    title={d.isDefault ? "Wird beim Start automatisch geöffnet" : "Als Standard festlegen"}
                  >
                    <Star size={13} fill={d.isDefault ? "currentColor" : "none"} />
                  </button>
                )}
                <span className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                  {d.id && (
                    <button
                      onClick={() => {
                        setRenamingId(d.id);
                        setRenameValue(d.name);
                      }}
                      className="p-1 text-ink-300 hover:text-ink-700 transition-colors"
                      aria-label="Umbenennen"
                    >
                      <Pencil size={13} />
                    </button>
                  )}
                  {d.id && dashboards.length > 1 && (
                    <button
                      onClick={() => handleDelete(d.id!)}
                      className="p-1 text-ink-300 hover:text-danger transition-colors"
                      aria-label="Löschen"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </span>
              </div>
            );
          })}

          <div className="border-t border-ink-100 mt-1 pt-1 px-2.5">
            {creating ? (
              <div className="flex items-center gap-1 py-1">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitCreate()}
                  placeholder="Name des Dashboards"
                  className="flex-1 rounded-lg border border-brand-500 px-2 py-1 text-sm outline-none bg-surface min-w-0"
                />
                <button disabled={pending} onClick={submitCreate} className="p-1 text-success hover:opacity-70 shrink-0" aria-label="Erstellen">
                  <Check size={15} />
                </button>
                <button onClick={() => setCreating(false)} className="p-1 text-ink-300 hover:text-ink-700 shrink-0" aria-label="Abbrechen">
                  <X size={15} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="flex items-center gap-1.5 w-full py-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors"
              >
                <Plus size={14} />
                Neues Dashboard
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
