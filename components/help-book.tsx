"use client";

import { useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { BookOpenText, X, ArrowLeft, Search, LifeBuoy, Upload, Camera, Trash2, ImageIcon } from "lucide-react";
import { HELP_CHAPTERS, type HelpChapter } from "@/lib/help-content";
import { NAV_CATALOG, getCurrentNavAreaId } from "@/lib/nav-items";
import { submitSupportTicket, type SupportAttachment } from "@/lib/actions/support";

const AREA_OPTIONS = [...NAV_CATALOG.map((n) => ({ id: n.id, label: n.label })), { id: "sonstiges", label: "Sonstiges" }];

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

function formatSize(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

type View = "list" | "chapter" | "support";

export function HelpBook() {
  const pathname = usePathname();
  // Antippen des Icons zeigt zuerst ein kleines Auswahlmenü ("Support
  // kontaktieren" / "Hilfe") statt direkt in die Hilfe-Uebersicht zu
  // springen -- so bleibt es EIN Icon (spart Platz, v.a. auf dem Handy),
  // aber der Nutzer entscheidet explizit, wo er hin moechte.
  const [menuOpen, setMenuOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [view, setView] = useState<View>("list");
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const [area, setArea] = useState(() => getCurrentNavAreaId(pathname));
  const [comment, setComment] = useState("");
  const [attachments, setAttachments] = useState<SupportAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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

  function toggleMenu() {
    setArea(getCurrentNavAreaId(pathname));
    setMenuOpen((o) => !o);
  }

  function chooseHelp() {
    setMenuOpen(false);
    setView("list");
    setPanelOpen(true);
  }

  function chooseSupport() {
    setMenuOpen(false);
    setView("support");
    setPanelOpen(true);
  }

  function close() {
    setPanelOpen(false);
    setMenuOpen(false);
    setQuery("");
    setActiveId(null);
    setView("list");
    resetSupportForm();
  }

  function resetSupportForm() {
    setComment("");
    setAttachments([]);
    setSubmitError("");
    setSubmitted(false);
  }

  // Aus einem Kapitel zurueck zur Hilfe-Uebersicht; von der Hilfe-Uebersicht
  // bzw. dem Support-Formular selbst zurueck zum kleinen Auswahlmenue.
  function goBack() {
    if (activeChapter) {
      setActiveId(null);
      return;
    }
    setPanelOpen(false);
    setMenuOpen(true);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubmitError("");
    setUploading(true);
    try {
      const blob = await upload(file.name, file, {
        access: "private",
        handleUploadUrl: "/api/upload",
        multipart: true,
      });
      setAttachments((prev) => [
        ...prev,
        { fileName: file.name, fileUrl: blob.url, mimeType: file.type || "application/octet-stream", fileSize: file.size },
      ]);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Upload fehlgeschlagen.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  async function submitTicket() {
    setSubmitError("");
    setSubmitting(true);
    const result = await submitSupportTicket({ area, comment, attachments });
    setSubmitting(false);
    if (result?.error) {
      setSubmitError(result.error);
      return;
    }
    setSubmitted(true);
  }

  return (
    <>
      <button
        onClick={toggleMenu}
        className="fixed bottom-20 right-4 md:bottom-5 md:right-5 z-40 flex items-center justify-center h-12 w-12 rounded-full bg-brand-500 text-white shadow-cardHover hover:bg-brand-600 transition-colors"
        aria-label="Hilfe & Support öffnen"
      >
        <BookOpenText size={20} />
      </button>

      {menuOpen && (
        <div className="fixed inset-0 z-50" onClick={() => setMenuOpen(false)}>
          <div
            className="absolute bottom-36 right-4 md:bottom-20 md:right-5 w-56 rounded-lg border border-ink-100 bg-surface shadow-cardHover p-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={chooseSupport}
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left hover:bg-ink-50 transition-colors"
            >
              <LifeBuoy size={17} className="text-brand-700 shrink-0" />
              <span className="text-sm font-medium text-ink-900">Support kontaktieren</span>
            </button>
            <button
              onClick={chooseHelp}
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left hover:bg-ink-50 transition-colors"
            >
              <BookOpenText size={17} className="text-brand-500 shrink-0" />
              <span className="text-sm font-medium text-ink-900">Hilfe</span>
            </button>
          </div>
        </div>
      )}

      {panelOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end p-4 pb-20 md:pb-6 sm:p-6"
          onClick={close}
        >
          <div className="absolute inset-0 bg-black/20" />
          <div
            className="relative w-full sm:w-[420px] h-[75vh] sm:h-[600px] max-h-[85vh] bg-surface rounded-card border border-ink-100 shadow-cardHover flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 p-4 border-b border-ink-100 shrink-0">
              <button onClick={goBack} className="text-ink-500 hover:text-ink-900 transition-colors" aria-label="Zurück">
                <ArrowLeft size={18} />
              </button>
              <h2 className="font-display font-semibold text-ink-900 flex-1 truncate">
                {view === "support" ? "Support kontaktieren" : activeChapter ? activeChapter.title : "Hilfe"}
              </h2>
              <button onClick={close} className="text-ink-300 hover:text-ink-700 transition-colors" aria-label="Schließen">
                <X size={18} />
              </button>
            </div>

            {view === "list" && !activeChapter && (
              <div className="p-3 border-b border-ink-100 shrink-0">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Hilfe durchsuchen …"
                    className="w-full rounded-lg border border-ink-100 pl-8 pr-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4">
              {view === "support" ? (
                submitted ? (
                  <div className="space-y-3 text-center py-8">
                    <LifeBuoy size={28} className="mx-auto text-success" />
                    <p className="text-sm font-medium text-ink-900">Danke, dein Ticket ist angekommen.</p>
                    <p className="text-xs text-ink-500">Wir melden uns so schnell wie möglich.</p>
                    <button
                      onClick={close}
                      className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 py-2 hover:bg-brand-600 transition-colors"
                    >
                      Fertig
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-ink-700">Bereich</label>
                      <select
                        value={area}
                        onChange={(e) => setArea(e.target.value)}
                        className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500"
                      >
                        {AREA_OPTIONS.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-ink-700">Worum geht's?</label>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={5}
                        placeholder="Beschreibe kurz, was los ist …"
                        className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm outline-none focus:border-brand-500 resize-y"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-ink-700">Screenshots (optional)</label>
                      <div className="flex flex-wrap gap-2">
                        <input ref={fileInputRef} type="file" onChange={handleFileChange} disabled={uploading} className="hidden" id="support-upload-file" />
                        <label
                          htmlFor="support-upload-file"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-ink-100 text-ink-700 text-xs font-medium px-3 py-1.5 hover:bg-ink-50 transition-colors cursor-pointer"
                        >
                          <Upload size={13} />
                          Datei hochladen
                        </label>
                        <input
                          ref={cameraInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleFileChange}
                          disabled={uploading}
                          className="hidden"
                          id="support-upload-camera"
                        />
                        <label
                          htmlFor="support-upload-camera"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-ink-100 text-ink-700 text-xs font-medium px-3 py-1.5 hover:bg-ink-50 transition-colors cursor-pointer"
                        >
                          <Camera size={13} />
                          Foto aufnehmen
                        </label>
                      </div>
                      {uploading && <p className="text-xs text-ink-500">Wird hochgeladen …</p>}
                      {attachments.length > 0 && (
                        <div className="space-y-1 pt-1">
                          {attachments.map((a, i) => (
                            <div key={i} className="flex items-center justify-between rounded-lg bg-ink-50 px-2.5 py-1.5 text-xs">
                              <span className="flex items-center gap-1.5 text-ink-700 truncate">
                                <ImageIcon size={13} className="text-ink-300 shrink-0" />
                                <span className="truncate">{a.fileName}</span>
                                <span className="text-ink-300 font-mono shrink-0">{formatSize(a.fileSize)}</span>
                              </span>
                              <button onClick={() => removeAttachment(i)} className="text-ink-300 hover:text-danger transition-colors shrink-0" aria-label="Entfernen">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {submitError && <p className="text-xs text-danger">{submitError}</p>}

                    <button
                      disabled={submitting || uploading || !comment.trim()}
                      onClick={submitTicket}
                      className="w-full rounded-lg bg-brand-500 text-white text-sm font-medium py-2.5 hover:bg-brand-600 disabled:opacity-60 transition-colors"
                    >
                      {submitting ? "Wird gesendet …" : "Ticket senden"}
                    </button>
                  </div>
                )
              ) : activeChapter ? (
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
