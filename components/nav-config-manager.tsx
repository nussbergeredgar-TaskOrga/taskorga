"use client";

import { useState, useTransition } from "react";
import { ArrowUp, ArrowDown, Eye, EyeOff } from "lucide-react";
import { saveNavConfig } from "@/lib/actions/nav";
import { NAV_CATALOG, type NavItemConfig } from "@/lib/nav-items";
import { ICON_MAP } from "@/lib/nav-icons";
import { cn } from "@/lib/utils";

export function NavConfigManager({ initialConfig }: { initialConfig: NavItemConfig[] }) {
  const [config, setConfig] = useState(initialConfig);
  const [, startTransition] = useTransition();

  const byId = new Map(NAV_CATALOG.map((c) => [c.id, c]));
  const sorted = [...config].sort((a, b) => a.order - b.order);

  function persist(next: NavItemConfig[]) {
    setConfig(next);
    startTransition(() => saveNavConfig(next));
  }

  function toggleVisible(id: string) {
    if (id === "einstellungen") return; // bleibt immer erreichbar
    persist(config.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)));
  }

  function move(id: string, direction: "up" | "down") {
    const ordered = [...config].sort((a, b) => a.order - b.order);
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

  return (
    <div>
      {sorted.map((w, i) => {
        const item = byId.get(w.id);
        if (!item) return null;
        const Icon = ICON_MAP[item.icon];
        return (
          <div key={w.id} className="flex items-center gap-2 py-2 border-b border-ink-100 last:border-0">
            <div className="flex flex-col">
              <button
                disabled={i === 0}
                onClick={() => move(w.id, "up")}
                className="text-ink-300 hover:text-ink-700 disabled:opacity-20 transition-colors"
                aria-label="Nach oben"
              >
                <ArrowUp size={13} />
              </button>
              <button
                disabled={i === sorted.length - 1}
                onClick={() => move(w.id, "down")}
                className="text-ink-300 hover:text-ink-700 disabled:opacity-20 transition-colors"
                aria-label="Nach unten"
              >
                <ArrowDown size={13} />
              </button>
            </div>
            <Icon size={16} className="text-ink-300 shrink-0" />
            <span className={cn("flex-1 text-sm", w.visible ? "text-ink-900" : "text-ink-300")}>
              {item.label}
            </span>
            <button
              disabled={w.id === "einstellungen"}
              onClick={() => toggleVisible(w.id)}
              className="p-1.5 text-ink-300 hover:text-ink-700 disabled:opacity-20 transition-colors"
              aria-label={w.visible ? "Ausblenden" : "Einblenden"}
            >
              {w.visible ? <Eye size={15} /> : <EyeOff size={15} />}
            </button>
          </div>
        );
      })}
      <p className="text-xs text-ink-300 mt-3">
        Auf dem Handy erscheinen die ersten 5 sichtbaren Punkte direkt im unteren Menü,
        der Rest unter „Mehr". „Einstellungen" bleibt immer erreichbar.
      </p>
    </div>
  );
}
