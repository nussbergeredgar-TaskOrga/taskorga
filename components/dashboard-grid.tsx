"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowUp, ArrowDown, Maximize2, Settings2, Trash2 } from "lucide-react";
import { saveDashboardLayout } from "@/lib/actions/dashboard";
import { deleteCustomKpi } from "@/lib/actions/custom-kpi";
import { CustomKpiForm } from "@/components/custom-kpi-form";
import { WIDGET_LABELS, type WidgetConfig, type WidgetSize } from "@/lib/dashboard-widgets";
import { cn } from "@/lib/utils";

const SIZE_CLASSES: Record<WidgetSize, string> = {
  sm: "col-span-1",
  md: "col-span-1 sm:col-span-2",
  lg: "col-span-1 sm:col-span-2 lg:col-span-4",
};

const NEXT_SIZE: Record<WidgetSize, WidgetSize> = { sm: "md", md: "lg", lg: "sm" };
const SIZE_LABEL: Record<WidgetSize, string> = { sm: "S", md: "M", lg: "L" };

export function DashboardGrid({
  initialLayout,
  widgetNodes,
}: {
  initialLayout: WidgetConfig[];
  widgetNodes: { id: string; label?: string; node: React.ReactNode }[];
}) {
  const router = useRouter();
  const [layout, setLayout] = useState(initialLayout);
  const [editing, setEditing] = useState(false);
  const [, startTransition] = useTransition();

  const nodeById = new Map(widgetNodes.map((w) => [w.id, w.node]));
  const labelById = new Map(widgetNodes.map((w) => [w.id, w.label]));
  const sorted = [...layout].sort((a, b) => a.order - b.order);

  function persist(next: WidgetConfig[]) {
    setLayout(next);
    startTransition(() => saveDashboardLayout(next));
  }

  function toggleVisible(id: string) {
    persist(layout.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)));
  }

  function cycleSize(id: string) {
    persist(layout.map((w) => (w.id === id ? { ...w, size: NEXT_SIZE[w.size] } : w)));
  }

  function move(id: string, direction: "up" | "down") {
    const ordered = [...layout].sort((a, b) => a.order - b.order);
    const idx = ordered.findIndex((w) => w.id === id);
    const swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (idx === -1 || swapWith < 0 || swapWith >= ordered.length) return;

    const a = ordered[idx];
    const b = ordered[swapWith];
    const aOrder = a.order;
    const next = ordered.map((w) => {
      if (w.id === a.id) return { ...w, order: b.order };
      if (w.id === b.id) return { ...w, order: aOrder };
      return w;
    });
    persist(next);
  }

  function removeCustomKpi(id: string) {
    if (!confirm("Diese Kachel wirklich löschen?")) return;
    const kpiId = id.replace("custom:", "");
    setLayout((prev) => prev.filter((w) => w.id !== id));
    startTransition(async () => {
      await deleteCustomKpi(kpiId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setEditing((e) => !e)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
            editing
              ? "bg-brand-500 text-white border-brand-500"
              : "border-ink-100 text-ink-700 hover:bg-ink-50"
          )}
        >
          <Settings2 size={14} />
          {editing ? "Fertig" : "Dashboard anpassen"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {sorted
          .filter((w) => (editing || w.visible) && nodeById.has(w.id))
          .map((w) => {
            const isCustom = w.id.startsWith("custom:");
            return (
              <div key={w.id} className={cn(SIZE_CLASSES[w.size], !w.visible && "opacity-40")}>
                {editing && (
                  <div className="flex items-center justify-between mb-1.5 px-1">
                    <span className="text-xs font-medium text-ink-500 truncate">
                      {labelById.get(w.id) ?? WIDGET_LABELS[w.id] ?? w.id}
                    </span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => move(w.id, "up")}
                        className="p-1 text-ink-300 hover:text-ink-700 transition-colors"
                        aria-label="Nach oben"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        onClick={() => move(w.id, "down")}
                        className="p-1 text-ink-300 hover:text-ink-700 transition-colors"
                        aria-label="Nach unten"
                      >
                        <ArrowDown size={13} />
                      </button>
                      <button
                        onClick={() => cycleSize(w.id)}
                        className="flex items-center gap-0.5 p-1 text-ink-300 hover:text-ink-700 transition-colors"
                        title="Größe ändern"
                      >
                        <Maximize2 size={13} />
                        <span className="text-[10px] font-mono">{SIZE_LABEL[w.size]}</span>
                      </button>
                      <button
                        onClick={() => toggleVisible(w.id)}
                        className="p-1 text-ink-300 hover:text-ink-700 transition-colors"
                        aria-label={w.visible ? "Ausblenden" : "Einblenden"}
                      >
                        {w.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                      </button>
                      {isCustom && (
                        <button
                          onClick={() => removeCustomKpi(w.id)}
                          className="p-1 text-ink-300 hover:text-danger transition-colors"
                          aria-label="Löschen"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {nodeById.get(w.id)}
              </div>
            );
          })}
      </div>

      {editing && (
        <div className="max-w-md">
          <CustomKpiForm />
        </div>
      )}
    </div>
  );
}
