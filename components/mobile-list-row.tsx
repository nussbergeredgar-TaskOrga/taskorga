"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

// Mobile-Gegenstueck zu den konfigurierbaren Tabellen-Ansichten (Kunden/
// Aufgaben/Termine/Anfragen "Liste"): auf schmalen Screens wird statt der
// horizontal scrollenden Tabelle eine gestapelte Zeile mit Titel + Chevron
// gezeigt, die restlichen sichtbaren Spalten erscheinen erst nach dem
// Ausklappen darunter -- gleiches Muster wie bei den Karten-Ansichten.
export function MobileListRow({
  href,
  icon,
  title,
  titleClassName,
  fields,
}: {
  href: string;
  icon?: ReactNode;
  title: string;
  titleClassName?: string;
  fields: { label: string; value: ReactNode }[];
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleFields = fields.filter((f) => f.value !== null && f.value !== undefined && f.value !== "");

  return (
    <div className="border-b border-ink-100 last:border-0">
      <div className="flex items-center gap-2 px-3 py-2.5">
        {icon}
        <Link
          href={href}
          className={`min-w-0 flex-1 truncate hover:underline ${titleClassName ?? "font-medium text-ink-900"}`}
        >
          {title}
        </Link>
        {visibleFields.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="shrink-0 p-1 text-ink-300 hover:text-ink-700 transition-colors"
            aria-label={expanded ? "Details einklappen" : "Details anzeigen"}
          >
            <ChevronDown size={16} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>
      {expanded && visibleFields.length > 0 && (
        <div className="space-y-1 px-3 pb-3">
          {visibleFields.map((f) => (
            <p key={f.label} className="text-xs text-ink-500">
              <span className="text-ink-300">{f.label}:</span> {f.value}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
