"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown, Filter as FilterIcon, Pencil, Trash2, Plus } from "lucide-react";
import {
  saveFilter,
  deleteFilter,
  setActiveFilter,
  type FilterCondition,
  type FilterEntityState,
  type FilterFieldDef,
  type SavedFilter,
} from "@/lib/actions/filters";
import { FilterBuilderModal } from "@/components/filter-builder-modal";

// Generischer Filter-Umschalter: funktioniert wie der Dashboard-Umschalter
// (aufklappen, aus gespeicherten Filtern waehlen, umbenennen/loeschen ueber
// Hover-Icons, "Neuer Filter" legt einen neuen an). Das eigentliche
// Zusammenstellen der Kriterien passiert im FilterBuilderModal-PopUp.
export function FilterSwitcher({
  entity,
  fields,
  state,
  onStateChange,
}: {
  entity: string;
  fields: FilterFieldDef[];
  state: FilterEntityState;
  onStateChange: (updater: (prev: FilterEntityState) => FilterEntityState) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const [modal, setModal] = useState<null | { mode: "create" } | { mode: "edit"; filter: SavedFilter }>(null);

  const active = state.filters.find((f) => f.id === state.activeFilterId) ?? null;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function activate(id: string | null) {
    setOpen(false);
    onStateChange((prev) => ({ ...prev, activeFilterId: id }));
    startTransition(() => setActiveFilter(entity, id));
  }

  function handleDelete(id: string) {
    if (!confirm("Diesen Filter wirklich löschen?")) return;
    onStateChange((prev) => ({
      filters: prev.filters.filter((f) => f.id !== id),
      activeFilterId: prev.activeFilterId === id ? null : prev.activeFilterId,
    }));
    startTransition(() => deleteFilter(entity, id));
  }

  function handleSave(name: string, conditions: FilterCondition[]) {
    const editingId = modal?.mode === "edit" ? modal.filter.id : undefined;
    setModal(null);
    startTransition(async () => {
      const saved = await saveFilter(entity, { id: editingId, name, conditions });
      onStateChange((prev) => {
        const exists = prev.filters.some((f) => f.id === saved.id);
        return {
          filters: exists ? prev.filters.map((f) => (f.id === saved.id ? saved : f)) : [...prev.filters, saved],
          activeFilterId: saved.id,
        };
      });
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-ink-100 bg-surface px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 transition-colors"
      >
        <FilterIcon size={15} />
        {active ? active.name : "Filter"}
        <ChevronDown size={13} className={`text-ink-300 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 mt-1 w-64 rounded-lg border border-ink-100 bg-surface shadow-cardHover py-1.5 z-30 max-h-96 overflow-y-auto">
          <button
            onClick={() => activate(null)}
            className={`flex items-center w-full px-3 py-2 text-sm text-left transition-colors ${
              !active ? "bg-brand-50 text-brand-700 font-medium" : "text-ink-700 hover:bg-ink-50"
            }`}
          >
            Alle anzeigen
          </button>

          {state.filters.map((f) => {
            const isActive = f.id === state.activeFilterId;
            return (
              <div
                key={f.id}
                className={`group flex items-center gap-1 px-2.5 py-2 text-sm transition-colors ${
                  isActive ? "bg-brand-50 text-brand-700 font-medium" : "text-ink-700 hover:bg-ink-50"
                }`}
              >
                <button onClick={() => activate(f.id)} className="flex-1 text-left truncate">
                  {f.name}
                </button>
                <span className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => {
                      setModal({ mode: "edit", filter: f });
                      setOpen(false);
                    }}
                    className="p-1 text-ink-300 hover:text-ink-700 transition-colors"
                    aria-label="Bearbeiten"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(f.id)}
                    className="p-1 text-ink-300 hover:text-danger transition-colors"
                    aria-label="Löschen"
                  >
                    <Trash2 size={13} />
                  </button>
                </span>
              </div>
            );
          })}

          <div className="border-t border-ink-100 mt-1 pt-1 px-2.5">
            <button
              onClick={() => {
                setModal({ mode: "create" });
                setOpen(false);
              }}
              className="flex items-center gap-1.5 w-full py-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors"
            >
              <Plus size={14} />
              Neuer Filter
            </button>
          </div>
        </div>
      )}

      {modal && (
        <FilterBuilderModal
          fields={fields}
          initialName={modal.mode === "edit" ? modal.filter.name : undefined}
          initialConditions={modal.mode === "edit" ? modal.filter.conditions : undefined}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
