"use client";

import { useMemo, useState } from "react";
import { BookOpenText, X, ArrowLeft, Search } from "lucide-react";
import { HELP_CHAPTERS, type HelpChapter } from "@/lib/help-content";

function renderWithBold(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="text-ink-900">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export function HelpBook() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;

    const results: { chapter: HelpChapter; snippet: string }[] = [];
    for (const chapter of HELP_CHAPTERS) {
      const haystack = `${chapter.title} ${chapter.description} ${chapter.paragraphs.join(" ")}`.toLowerCase();
      if (haystack.includes(q)) {
        const match = chapter.paragraphs.find((p) => p.toLowerCase().includes(q));
        results.push({ chapter, snippet: match ?? chapter.description });
      }
    }
    return results;
  }, [query]);

  const activeChapter = HELP_CHAPTERS.find((c) => c.id === activeId);

  function close() {
    setOpen(false);
    setQuery("");
    setActiveId(null);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center justify-center h-12 w-12 rounded-full bg-brand-500 text-white shadow-cardHover hover:bg-brand-600 transition-colors"
        aria-label="Hilfe öffnen"
      >
        <BookOpenText size={20} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6" onClick={close}>
          <div className="absolute inset-0 bg-black/20" />
          <div
            className="relative w-full sm:w-[420px] h-[75vh] sm:h-[600px] max-h-[85vh] bg-surface rounded-card border border-ink-100 shadow-cardHover flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 p-4 border-b border-ink-100 shrink-0">
              {activeChapter ? (
                <button
                  onClick={() => setActiveId(null)}
                  className="text-ink-500 hover:text-ink-900 transition-colors"
                  aria-label="Zurück zur Übersicht"
                >
                  <ArrowLeft size={18} />
                </button>
              ) : (
                <BookOpenText size={18} className="text-brand-500" />
              )}
              <h2 className="font-display font-semibold text-ink-900 flex-1 truncate">
                {activeChapter ? activeChapter.title : "Hilfe"}
              </h2>
              <button onClick={close} className="text-ink-300 hover:text-ink-700 transition-colors" aria-label="Schließen">
                <X size={18} />
              </button>
            </div>

            {!activeChapter && (
              <div className="p-3 border-b border-ink-100 shrink-0">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Hilfe durchsuchen …"
                    className="w-full rounded-lg border border-ink-100 pl-8 pr-3 py-2 text-sm outline-none focus:border-brand-500"
                    autoFocus
                  />
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4">
              {activeChapter ? (
                <div className="space-y-3 text-sm text-ink-700 leading-relaxed">
                  {activeChapter.paragraphs.map((p, i) => (
                    <p key={i}>{renderWithBold(p)}</p>
                  ))}
                </div>
              ) : searchResults ? (
                <div className="space-y-1.5">
                  {searchResults.length === 0 && (
                    <p className="text-sm text-ink-300">Keine Treffer für „{query}".</p>
                  )}
                  {searchResults.map(({ chapter, snippet }) => (
                    <button
                      key={chapter.id}
                      onClick={() => setActiveId(chapter.id)}
                      className="block w-full text-left rounded-lg px-3 py-2.5 hover:bg-ink-50 transition-colors"
                    >
                      <p className="text-sm font-medium text-ink-900">{chapter.title}</p>
                      <p className="text-xs text-ink-500 line-clamp-2 mt-0.5">{snippet.replace(/\*\*/g, "")}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {HELP_CHAPTERS.map((chapter) => (
                    <button
                      key={chapter.id}
                      onClick={() => setActiveId(chapter.id)}
                      className="block w-full text-left rounded-lg px-3 py-2.5 hover:bg-ink-50 transition-colors"
                    >
                      <p className="text-sm font-medium text-ink-900">{chapter.title}</p>
                      <p className="text-xs text-ink-500 mt-0.5">{chapter.description}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
