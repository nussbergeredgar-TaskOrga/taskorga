"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Search, X } from "lucide-react";
import { addTagToRecord, removeTagFromRecord } from "@/lib/actions/tags";
import { useTagCatalog } from "@/components/tag-catalog-context";
import type { TagCatalog, TagEntity, TagItem } from "@/lib/tags";

// Zeigt die Tags eines Datensatzes als Chips und erlaubt, per Suchfenster
// weitere hinzuzufuegen. Neue Tags werden bewusst NICHT hier angelegt, sondern
// vom Admin in den Einstellungen (Anfragen & Vertrieb -> Tags).
export function TagPicker({
  entity,
  recordId,
  initialTags,
  catalog: catalogProp,
  isAdmin: isAdminProp,
}: {
  entity: TagEntity;
  recordId: string;
  initialTags: TagItem[];
  // Ohne Angabe kommen Katalog und Admin-Status aus dem Layout-Kontext
  catalog?: TagCatalog;
  isAdmin?: boolean;
}) {
  const ctx = useTagCatalog();
  const catalog = catalogProp ?? ctx.catalog;
  const isAdmin = isAdminProp ?? ctx.isAdmin;
  const [tags, setTags] = useState<TagItem[]>(initialTags);
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const assignedIds = useMemo(() => new Set(tags.map((t) => t.id)), [tags]);
  const needle = term.trim().toLowerCase();

  // Bereits vergebene Tags und Nicht-Treffer ausblenden; Gruppen ohne Treffer
  // entfallen ganz.
  const sections = useMemo(() => {
    const match = (t: TagItem) => !assignedIds.has(t.id) && (!needle || t.name.toLowerCase().includes(needle));
    const out = catalog.groups
      .map((g) => ({ key: g.id, title: g.name, tags: g.tags.filter(match) }))
      .filter((s) => s.tags.length > 0);
    const rest = catalog.ungrouped.filter(match);
    if (rest.length > 0) {
      out.push({ key: "__none", title: catalog.groups.length > 0 ? "Ohne Gruppe" : "", tags: rest });
    }
    return out;
  }, [catalog, assignedIds, needle]);

  const catalogEmpty = catalog.groups.every((g) => g.tags.length === 0) && catalog.ungrouped.length === 0;

  function apply(action: typeof addTagToRecord, tagId: string) {
    setError(null);
    startTransition(async () => {
      const res = await action(entity, recordId, tagId);
      if (res.error) setError(res.error);
      else if (res.tags) setTags(res.tags);
    });
  }

  return (
    <div ref={rootRef} className="relative flex flex-wrap items-center gap-1.5">
      {tags.map((t) => (
        <span
          key={t.id}
          className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700"
        >
          {t.name}
          <button
            type="button"
            disabled={pending}
            onClick={() => apply(removeTagFromRecord, t.id)}
            className="rounded-full p-0.5 text-brand-700/60 hover:text-brand-700 transition-colors disabled:opacity-40"
            aria-label={`Tag „${t.name}“ entfernen`}
          >
            <X size={12} />
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setTerm("");
        }}
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-ink-100 px-2.5 py-1 text-xs font-medium text-ink-500 hover:border-brand-500 hover:text-brand-700 transition-colors"
      >
        <Plus size={12} />
        Tag
      </button>

      {error && <span className="text-xs text-danger">{error}</span>}

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-64 rounded-lg border border-ink-100 bg-surface shadow-cardHover">
          <div className="flex items-center gap-2 border-b border-ink-100 px-3 py-2">
            <Search size={14} className="shrink-0 text-ink-300" />
            <input
              ref={inputRef}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Tag suchen …"
              className="w-full bg-transparent text-sm outline-none placeholder:text-ink-300"
            />
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {catalogEmpty ? (
              <p className="px-3 py-3 text-xs text-ink-500">
                Noch keine Tags angelegt.
                {isAdmin && (
                  <>
                    {" "}
                    <Link href="/einstellungen/vertrieb" className="text-brand-700 hover:underline">
                      In den Einstellungen anlegen
                    </Link>
                  </>
                )}
              </p>
            ) : sections.length === 0 ? (
              <p className="px-3 py-3 text-xs text-ink-500">
                {needle ? "Kein passender Tag gefunden." : "Alle Tags sind bereits vergeben."}
              </p>
            ) : (
              sections.map((s) => (
                <div key={s.key}>
                  {s.title && (
                    <p className="px-3 pb-0.5 pt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-300">
                      {s.title}
                    </p>
                  )}
                  {s.tags.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        apply(addTagToRecord, t.id);
                        setOpen(false);
                      }}
                      className="block w-full px-3 py-1.5 text-left text-sm text-ink-700 hover:bg-ink-50 transition-colors disabled:opacity-40"
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
