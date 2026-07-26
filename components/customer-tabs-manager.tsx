"use client";

import { useState, useTransition } from "react";
import { ArrowUp, ArrowDown, Eye, EyeOff } from "lucide-react";
import { saveCustomerTabsConfig } from "@/lib/actions/customer-tabs";
import { CUSTOMER_TAB_CATALOG, type CustomerTabConfig } from "@/lib/customer-tabs";

export function CustomerTabsManager({ initialConfig }: { initialConfig: CustomerTabConfig[] }) {
  const [config, setConfig] = useState(initialConfig);
  const [, startTransition] = useTransition();

  const byId = new Map(CUSTOMER_TAB_CATALOG.map((c) => [c.id, c]));
  const sorted = [...config].sort((a, b) => a.order - b.order);

  function persist(next: CustomerTabConfig[]) {
    setConfig(next);
    startTransition(() => saveCustomerTabsConfig(next));
  }

  function toggleVisible(id: string) {
    if (id === "uebersicht") return; // Übersicht bleibt immer sichtbar
    persist(config.map((t) => (t.id === id ? { ...t, visible: !t.visible } : t)));
  }

  function move(id: string, direction: "up" | "down") {
    const ordered = [...config].sort((a, b) => a.order - b.order);
    const idx = ordered.findIndex((t) => t.id === id);
    const swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (idx === -1 || swapWith < 0 || swapWith >= ordered.length) return;

    const a = ordered[idx];
    const b = ordered[swapWith];
    const aOrder = a.order;
    const next = ordered.map((t) => {
      if (t.id === a.id) return { ...t, order: b.order };
      if (t.id === b.id) return { ...t, order: aOrder };
      return t;
    });
    persist(next);
  }

  return (
    <div>
      {sorted.map((t, i) => {
        const item = byId.get(t.id);
        if (!item) return null;
        return (
          <div key={t.id} className="flex items-center gap-2 py-2 border-b border-ink-100 last:border-0">
            <div className="flex flex-col">
              <button
                disabled={i === 0}
                onClick={() => move(t.id, "up")}
                className="text-ink-300 hover:text-ink-700 disabled:opacity-20 transition-colors"
                aria-label="Nach oben"
              >
                <ArrowUp size={13} />
              </button>
              <button
                disabled={i === sorted.length - 1}
                onClick={() => move(t.id, "down")}
                className="text-ink-300 hover:text-ink-700 disabled:opacity-20 transition-colors"
                aria-label="Nach unten"
              >
                <ArrowDown size={13} />
              </button>
            </div>
            <span className={`flex-1 text-sm ${t.visible ? "text-ink-900" : "text-ink-300"}`}>
              {item.label}
            </span>
            <button
              disabled={t.id === "uebersicht"}
              onClick={() => toggleVisible(t.id)}
              className="p-1.5 text-ink-300 hover:text-ink-700 disabled:opacity-20 transition-colors"
              aria-label={t.visible ? "Ausblenden" : "Einblenden"}
            >
              {t.visible ? <Eye size={15} /> : <EyeOff size={15} />}
            </button>
          </div>
        );
      })}
      <p className="text-xs text-ink-300 mt-3">
        „Übersicht" bleibt immer sichtbar. Änderungen gelten für alle Nutzer der Firma.
      </p>
    </div>
  );
}
