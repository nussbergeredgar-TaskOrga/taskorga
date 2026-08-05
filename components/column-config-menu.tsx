"use client";

import { useEffect, useRef, useState } from "react";
import { Columns3, GripVertical, Eye, EyeOff, ChevronDown } from "lucide-react";
import type { ColumnConfig } from "@/lib/actions/list-view";

// Generisches "Spalten anpassen"-Menue: sichtbar/unsichtbar per Klick,
// Reihenfolge per Drag & Drop. Die Spaltenbreite wird bewusst nicht hier,
// sondern direkt am Tabellenkopf per Ziehen an der rechten Kante eingestellt
// (naeher am Excel-Vorbild) -- dieses Menue kuemmert sich nur um "welche
// Spalten und in welcher Reihenfolge".
export function ColumnConfigMenu({
  columns,
  labels,
  onChange,
}: {
  columns: ColumnConfig[];
  labels: Record<string, string>;
  onChange: (updater: (prev: ColumnConfig[]) => ColumnConfig[]) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const dragKeyRef = useRef<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  const sorted = [...columns].sort((a, b) => a.order - b.order);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Nimmt eine Updater-Funktion statt eines fertigen Arrays entgegen: bei
  // mehreren schnell aufeinanderfolgenden Klicks (z.B. zwei Checkboxen kurz
  // hintereinander) rendert React nicht zwingend zwischen den Klicks neu --
  // ein direkt aus den (dann veralteten) Props berechnetes Array wuerde die
  // vorherige Aenderung stillschweigend wieder verwerfen. Ueber die
  // funktionale setState-Form bekommt jeder Klick garantiert den zuletzt
  // aktuellen Stand.
  function toggleVisible(key: string) {
    onChange((prev) => prev.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c)));
  }

  function reorder(fromKey: string, toKey: string) {
    if (fromKey === toKey) return;
    onChange((prev) => {
      const list = [...prev].sort((a, b) => a.order - b.order);
      const fromIdx = list.findIndex((c) => c.key === fromKey);
      const toIdx = list.findIndex((c) => c.key === toKey);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = list.splice(fromIdx, 1);
      list.splice(toIdx, 0, moved);
      return list.map((c, i) => ({ ...c, order: i }));
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-ink-100 bg-surface px-3 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 transition-colors"
      >
        <Columns3 size={15} />
        Spalten
        <ChevronDown size={13} className={`text-ink-300 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-64 rounded-lg border border-ink-100 bg-surface shadow-cardHover py-1.5 z-30 max-h-96 overflow-y-auto">
          <p className="px-3 py-1.5 text-xs font-medium text-ink-300">Spalten ein-/ausblenden, ziehen zum Umsortieren</p>
          {sorted.map((c) => (
            <div
              key={c.key}
              draggable
              onDragStart={() => {
                dragKeyRef.current = c.key;
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOverKey !== c.key) setDragOverKey(c.key);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragKeyRef.current) reorder(dragKeyRef.current, c.key);
                dragKeyRef.current = null;
                setDragOverKey(null);
              }}
              onDragEnd={() => {
                dragKeyRef.current = null;
                setDragOverKey(null);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm transition-colors ${
                dragOverKey === c.key ? "bg-brand-50" : "hover:bg-ink-50"
              } ${!c.visible ? "opacity-50" : ""}`}
            >
              <GripVertical size={14} className="text-ink-300 cursor-grab shrink-0" />
              <span className="flex-1 truncate text-ink-700">{labels[c.key] ?? c.key}</span>
              <button
                onClick={() => toggleVisible(c.key)}
                className="p-1 text-ink-300 hover:text-ink-700 transition-colors shrink-0"
                aria-label={c.visible ? "Ausblenden" : "Einblenden"}
              >
                {c.visible ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
