"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Maximize2,
  Settings2,
  Pencil,
  Check,
  X,
  ListTodo,
  Wallet,
  FileText,
  TrendingUp,
  Trophy,
  XCircle,
  CalendarClock,
  CalendarCheck,
} from "lucide-react";
import { saveDashboardLayout } from "@/lib/actions/dashboard";
import { KpiCard } from "@/components/kpi-card";
import { WIDGET_LABELS, ACCENT_OPTIONS, type WidgetConfig, type WidgetSize } from "@/lib/dashboard-widgets";
import { cn } from "@/lib/utils";

const SIZE_CLASSES: Record<WidgetSize, string> = {
  sm: "col-span-1",
  md: "col-span-1 sm:col-span-2",
  lg: "col-span-1 sm:col-span-2 lg:col-span-4",
};

const NEXT_SIZE: Record<WidgetSize, WidgetSize> = { sm: "md", md: "lg", lg: "sm" };
const SIZE_LABEL: Record<WidgetSize, string> = { sm: "S", md: "M", lg: "L" };

// Icon-Komponenten koennen nicht vom Server an eine Client-Komponente
// durchgereicht werden -- die feste KPI-Kachel liefert stattdessen den
// Namen, hier wird er auf die echte Komponente gemappt.
const ICONS: Record<string, typeof ListTodo> = {
  ListTodo,
  Wallet,
  FileText,
  TrendingUp,
  Trophy,
  XCircle,
  CalendarClock,
  CalendarCheck,
};

type WidgetNodeEntry = {
  id: string;
  label?: string;
  node?: React.ReactNode;
  kpi?: { label: string; value: string; icon?: string; accent: string; href?: string };
};

export function DashboardGrid({
  initialLayout,
  widgetNodes,
  dashboardId,
}: {
  initialLayout: WidgetConfig[];
  widgetNodes: WidgetNodeEntry[];
  dashboardId?: string | null;
}) {
  const [layout, setLayout] = useState(initialLayout);
  const [editing, setEditing] = useState(false);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState("");
  const [accentDraft, setAccentDraft] = useState("");
  const [, startTransition] = useTransition();
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const isFirstLayoutRender = useRef(true);

  const entryById = new Map(widgetNodes.map((w) => [w.id, w]));
  const labelById = new Map(widgetNodes.map((w) => [w.id, w.label]));
  const sorted = [...layout].sort((a, b) => a.order - b.order);

  // Jeder Klick (Sichtbarkeit, Größe, Reihenfolge) aktualisiert die Anzeige
  // sofort, aber mehrere schnelle Klicks hintereinander (z.B. dreimal auf
  // "Nach oben") sollen nur eine einzige Speicheranfrage ausloesen -- sonst
  // koennten parallele Anfragen in vertauschter Reihenfolge beim Server
  // ankommen und einen neueren Stand mit einem aelteren ueberschreiben. Der
  // Effect reagiert auf jede layout-Aenderung und bricht einen noch laufenden
  // Timer automatisch ab (React-Cleanup), bevor ein neuer gestartet wird --
  // ohne die Anzeige selbst zu verzoegern.
  useEffect(() => {
    if (isFirstLayoutRender.current) {
      isFirstLayoutRender.current = false;
      return;
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      startTransition(() => saveDashboardLayout(layout, dashboardId));
    }, 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, dashboardId]);

  // Flusht eine noch ausstehende Speicherung sofort (z.B. beim Wechsel des
  // Dashboards oder Verlassen der Seite), damit ein letzter Klick kurz vor dem
  // Debounce-Intervall nicht verloren geht.
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveDashboardLayout(layoutRef.current, dashboardId);
      }
    };
  }, [dashboardId]);

  // Funktionale setState-Form (statt der Closure-Variable "layout" direkt zu
  // lesen), damit mehrere Klicks, die noch vor dem naechsten Render passieren,
  // korrekt aufeinander aufbauen statt vom selben veralteten Stand auszugehen.
  function toggleVisible(id: string) {
    setLayout((prev) => prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)));
  }

  function cycleSize(id: string) {
    setLayout((prev) => prev.map((w) => (w.id === id ? { ...w, size: NEXT_SIZE[w.size] } : w)));
  }

  function move(id: string, direction: "up" | "down") {
    setLayout((prev) => {
      const ordered = [...prev].sort((a, b) => a.order - b.order);
      const idx = ordered.findIndex((w) => w.id === id);
      const swapWith = direction === "up" ? idx - 1 : idx + 1;
      if (idx === -1 || swapWith < 0 || swapWith >= ordered.length) return prev;

      const a = ordered[idx];
      const b = ordered[swapWith];
      const aOrder = a.order;
      return ordered.map((w) => {
        if (w.id === a.id) return { ...w, order: b.order };
        if (w.id === b.id) return { ...w, order: aOrder };
        return w;
      });
    });
  }

  function startEditLabel(w: WidgetConfig, defaultLabel: string, defaultAccent: string) {
    setEditingLabelId(w.id);
    setLabelDraft(w.label ?? defaultLabel);
    setAccentDraft(w.accent ?? defaultAccent);
  }

  function saveLabel(id: string) {
    setLayout((prev) =>
      prev.map((w) => (w.id === id ? { ...w, label: labelDraft.trim() || undefined, accent: accentDraft } : w))
    );
    setEditingLabelId(null);
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
          .filter((w) => (editing || w.visible) && entryById.has(w.id))
          .map((w) => {
            const entry = entryById.get(w.id)!;
            return (
              <div key={w.id} className={cn(SIZE_CLASSES[w.size], !w.visible && "opacity-40")}>
                {editing && (
                  <div className="flex items-center justify-between mb-1.5 px-1">
                    <span className="text-xs font-medium text-ink-500 truncate">
                      {labelById.get(w.id) ?? WIDGET_LABELS[w.id] ?? w.id}
                    </span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {entry.kpi && (
                        <button
                          onClick={() => startEditLabel(w, entry.kpi!.label, entry.kpi!.accent)}
                          className="p-1 text-ink-300 hover:text-ink-700 transition-colors"
                          aria-label="Bearbeiten"
                        >
                          <Pencil size={13} />
                        </button>
                      )}
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
                    </div>
                  </div>
                )}

                {editingLabelId === w.id ? (
                  <div className="rounded-card border border-dashed border-brand-500 bg-ink-50 p-3 space-y-2">
                    <input
                      autoFocus
                      value={labelDraft}
                      onChange={(e) => setLabelDraft(e.target.value)}
                      className="w-full rounded-lg border border-ink-100 px-2.5 py-1.5 text-sm outline-none focus:border-brand-500 bg-surface"
                      placeholder="Titel"
                    />
                    <select
                      value={accentDraft}
                      onChange={(e) => setAccentDraft(e.target.value)}
                      className="w-full rounded-lg border border-ink-100 px-2.5 py-1.5 text-sm outline-none focus:border-brand-500 bg-surface"
                    >
                      {ACCENT_OPTIONS.map((a) => (
                        <option key={a.value} value={a.value}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => saveLabel(w.id)}
                        className="flex items-center gap-1 rounded-lg bg-brand-500 text-white text-xs font-medium px-2.5 py-1.5 hover:bg-brand-600 transition-colors"
                      >
                        <Check size={12} /> Speichern
                      </button>
                      <button
                        onClick={() => setEditingLabelId(null)}
                        className="flex items-center gap-1 rounded-lg border border-ink-100 text-ink-700 text-xs font-medium px-2.5 py-1.5 hover:bg-ink-50 transition-colors"
                      >
                        <X size={12} /> Abbrechen
                      </button>
                    </div>
                  </div>
                ) : entry.kpi ? (
                  <KpiCard
                    label={w.label ?? entry.kpi.label}
                    value={entry.kpi.value}
                    icon={entry.kpi.icon ? ICONS[entry.kpi.icon] : undefined}
                    accent={w.accent ?? entry.kpi.accent}
                    href={entry.kpi.href}
                  />
                ) : (
                  entry.node
                )}
              </div>
            );
          })}
      </div>

      <p className="text-xs text-ink-300">
        Eigene Kennzahlen-Kacheln erstellst und verwaltest du unter{" "}
        <Link href="/einblicke" className="text-brand-700 hover:underline">
          Einblicke
        </Link>
        .
      </p>
    </div>
  );
}
