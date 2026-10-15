"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, X } from "lucide-react";
import type { ChecklistItem } from "@/lib/onboarding-checklist";

// Browser-lokal je Firma: Ausblenden ist eine reine Komfortfunktion, ohne
// Speicher (privater Modus o.ae.) erscheint die Karte einfach wieder.
function storageKey(companyId: string) {
  return `taskorga-checklist-hidden:${companyId}`;
}

export function OnboardingChecklist({ companyId, items }: { companyId: string; items: ChecklistItem[] }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(storageKey(companyId)) === "1");
    } catch {
      // ohne Speicher einfach sichtbar lassen
    }
  }, [companyId]);

  const doneCount = items.filter((i) => i.done).length;
  const remainingMinutes = items.filter((i) => !i.done).reduce((sum, i) => sum + i.minutes, 0);
  const percent = Math.round((doneCount / items.length) * 100);

  if (hidden || doneCount === items.length) return null;

  function hide() {
    setHidden(true);
    try {
      localStorage.setItem(storageKey(companyId), "1");
    } catch {
      // egal
    }
  }

  return (
    <div className="rounded-card border border-brand-500/30 bg-brand-500/5 p-6 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display font-semibold text-lg text-ink-900">In 30 Minuten startklar</h2>
          <p className="text-sm text-ink-500 mt-1">
            {doneCount} von {items.length} Schritten erledigt — noch ca. {remainingMinutes} Minuten, bis dein
            Betrieb vollständig eingerichtet ist.
          </p>
        </div>
        <button
          onClick={hide}
          className="shrink-0 rounded-lg p-1.5 text-ink-300 hover:bg-ink-50 hover:text-ink-700 transition-colors"
          aria-label="Checkliste ausblenden"
          title="Ausblenden"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
        <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${percent}%` }} />
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.id}>
            <div
              className={`flex items-start gap-3 rounded-lg border bg-surface p-3 transition-colors ${
                item.done ? "border-ink-100 opacity-70" : "border-ink-100 hover:border-brand-500"
              }`}
            >
              {item.done ? (
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" />
              ) : (
                <Circle size={18} className="mt-0.5 shrink-0 text-ink-300" />
              )}
              <div className="min-w-0 flex-1">
                <Link
                  href={item.href}
                  className={`text-sm font-medium hover:underline ${
                    item.done ? "text-ink-500 line-through" : "text-ink-900"
                  }`}
                >
                  {item.title}
                </Link>
                {!item.done && (
                  <>
                    <p className="text-xs text-ink-500 mt-0.5">{item.description}</p>
                    <p className="text-[11px] text-ink-300 mt-1">
                      ca. {item.minutes} Min.
                      {item.altHref && (
                        <>
                          {" · "}
                          <Link href={item.altHref} className="text-brand-700 hover:underline">
                            {item.altLabel}
                          </Link>
                        </>
                      )}
                    </p>
                  </>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs text-ink-500">
        Tipp: Installiere TaskOrga auf deinem Handy (Browser-Menü → „Zum Startbildschirm hinzufügen“), dann hast du
        Aufgaben, Termine und Kunden auch unterwegs dabei.
      </p>
    </div>
  );
}
