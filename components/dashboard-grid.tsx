"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  GripVertical,
  Eye,
  X,
  ArrowUp,
  ArrowDown,
  Maximize2,
  Settings2,
  Pencil,
  Check,
  Plus,
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
  // Ref statt State: dragstart/dragover/drop koennen ohne Zeit fuer einen
  // React-Rerender dazwischen feuern, ein State-Wert waere im drop-Handler
  // dann noch der alte (null). Ein Ref liest/schreibt sofort synchron.
  const dragIdRef = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const isFirstLayoutRender = useRef(true);

  const entryById = new Map(widgetNodes.map((w) => [w.id, w]));
  const labelById = new Map(widgetNodes.map((w) => [w.id, w.label]));
  const isKnown = (w: WidgetConfig) => entryById.has(w.id);
  const visibleSorted = layout.filter((w) => w.visible && isKnown(w)).sort((a, b) => a.order - b.order);
  const hiddenList = layout.filter((w) => !w.visible && isKnown(w));

  // Jeder Klick/Drag (Sichtbarkeit, Größe, Reihenfolge) aktualisiert die
  // Anzeige sofort, aber mehrere schnelle Aenderungen hintereinander sollen
  // nur eine einzige Speicheranfrage ausloesen -- sonst koennten parallele
  // Anfragen in vertauschter Reihenfolge beim Server ankommen und einen
  // neueren Stand mit einem aelteren ueberschreiben. Der Effect reagiert auf
  // jede layout-Aenderung und bricht einen noch laufenden Timer automatisch
  // ab (React-Cleanup), bevor ein neuer gestartet wird -- ohne die Anzeige
  // selbst zu verzoegern.
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

  // Hidden-Kacheln bleiben im Layout gespeichert (visible: false), erscheinen
  // aber nicht mehr in der Bearbeiten-Ansicht des Grids selbst -- stattdessen
  // unten in einer eigenen Liste zum Wiederhinzufuegen. So fuehlt sich das
  // Ausblenden wie ein echtes Entfernen aus dem Dashboard an, ohne dass die
  // Kachel fuer immer verloren geht.
  function hide(id: string) {
    setLayout((prev) => prev.map((w) => (w.id === id ? { ...w, visible: false } : w)));
  }

  function show(id: string) {
    setLayout((prev) => {
      const maxOrder = Math.max(-1, ...prev.filter((w) => w.visible && isKnown(w)).map((w) => w.order));
      return prev.map((w) => (w.id === id ? { ...w, visible: true, order: maxOrder + 1 } : w));
    });
  }

  function cycleSize(id: string) {
    setLayout((prev) => prev.map((w) => (w.id === id ? { ...w, size: NEXT_SIZE[w.size] } : w)));
  }

  // Reihenfolge wird ausschliesslich innerhalb der sichtbaren Kacheln
  // berechnet (ausgeblendete haben keine sinnvolle Position) und danach
  // 0..n-1 neu durchnummeriert -- sowohl fuer die Pfeil-Buttons als auch
  // fuers Drag & Drop, damit beide Wege konsistent bleiben.
  function reorderVisible(fromId: string, toId: string) {
    if (fromId === toId) return;
    setLayout((prev) => {
      const visible = prev.filter((w) => w.visible && isKnown(w)).sort((a, b) => a.order - b.order);
      const rest = prev.filter((w) => !(w.visible && isKnown(w)));
      const fromIdx = visible.findIndex((w) => w.id === fromId);
      const toIdx = visible.findIndex((w) => w.id === toId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const reordered = [...visible];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);
      return [...reordered.map((w, i) => ({ ...w, order: i })), ...rest];
    });
  }

  function move(id: string, direction: "up" | "down") {
    const idx = visibleSorted.findIndex((w) => w.id === id);
    const swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (idx === -1 || swapWith < 0 || swapWith >= visibleSorted.length) return;
    reorderVisible(id, visibleSorted[swapWith].id);
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
        {visibleSorted.map((w) => {
          const entry = entryById.get(w.id)!;
          return (
            <div
              key={w.id}
              draggable={editing}
              onDragStart={(e) => {
                dragIdRef.current = w.id;
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                if (!editing) return;
                e.preventDefault();
                if (dragOverId !== w.id) setDragOverId(w.id);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIdRef.current) reorderVisible(dragIdRef.current, w.id);
                dragIdRef.current = null;
                setDragOverId(null);
              }}
              onDragEnd={() => {
                dragIdRef.current = null;
                setDragOverId(null);
              }}
              className={cn(
                SIZE_CLASSES[w.size],
                editing && dragOverId === w.id && dragIdRef.current !== w.id && "ring-2 ring-brand-500 rounded-card",
                editing && dragIdRef.current === w.id && "opacity-50"
              )}
            >
              {editing && (
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <div className="flex items-center gap-1 min-w-0">
                    <GripVertical size={14} className="text-ink-300 cursor-grab shrink-0" />
                    <span className="text-xs font-medium text-ink-500 truncate">
                      {labelById.get(w.id) ?? WIDGET_LABELS[w.id] ?? w.id}
                    </span>
                  </div>
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
                      onClick={() => hide(w.id)}
                      className="p-1 text-ink-300 hover:text-danger transition-colors"
                      aria-label="Vom Dashboard entfernen"
                      title="Vom Dashboard entfernen"
                    >
                      <X size={13} />
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

      {editing && hiddenList.length > 0 && (
        <div className="rounded-card border border-dashed border-ink-100 p-4">
          <p className="text-xs font-medium text-ink-500 mb-2.5 flex items-center gap-1.5">
            <Eye size={13} />
            Entfernte Kacheln — zum Hinzufügen anklicken
          </p>
          <div className="flex flex-wrap gap-2">
            {hiddenList.map((w) => (
              <button
                key={w.id}
                onClick={() => show(w.id)}
                className="flex items-center gap-1.5 rounded-lg border border-ink-100 bg-surface text-ink-700 text-xs font-medium px-2.5 py-1.5 hover:bg-ink-50 transition-colors"
              >
                <Plus size={12} />
                {labelById.get(w.id) ?? WIDGET_LABELS[w.id] ?? w.id}
              </button>
            ))}
          </div>
        </div>
      )}

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
