"use client";

import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { PLACEHOLDER_GROUPS } from "@/lib/document-placeholders";

export function PlaceholderTextarea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  function insert(token: string) {
    const el = ref.current;
    const snippet = `{{${token}}}`;
    if (!el) {
      onChange(value + snippet);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + snippet + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + snippet.length;
      el.selectionStart = el.selectionEnd = pos;
    });
  }

  return (
    <div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-surface resize-none font-mono"
      />
      <div className="mt-1.5 space-y-1">
        {PLACEHOLDER_GROUPS.map((group) => {
          const open = openGroup === group.label;
          return (
            <div key={group.label} className="rounded-lg border border-ink-100 overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenGroup(open ? null : group.label)}
                className="flex w-full items-center justify-between gap-1 px-2 py-1 text-left hover:bg-ink-50 transition-colors"
              >
                <span className="text-[10px] uppercase text-ink-300">{group.label}</span>
                <ChevronDown
                  size={12}
                  className={`shrink-0 text-ink-300 transition-transform ${open ? "rotate-180" : ""}`}
                />
              </button>
              {open && (
                <div className="flex flex-wrap items-center gap-1 px-2 pb-1.5">
                  {group.tokens.map((t) => (
                    <button
                      key={t.token}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => insert(t.token)}
                      className="rounded bg-ink-50 hover:bg-ink-100 text-ink-700 text-[11px] px-1.5 py-0.5 font-mono transition-colors"
                      title={t.label}
                    >
                      {`{{${t.token}}}`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
