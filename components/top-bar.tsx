"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Bell, Plus, LogOut, Users, Inbox, FileText, Briefcase, Calendar, ListTodo, Wallet, X, Megaphone } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { markAnnouncementsSeen, type AnnouncementItem, type LatestVersion } from "@/lib/actions/announcements";
import { requestUpdate } from "@/lib/actions/update-request";

const NEW_ITEMS = [
  { label: "Neuer Kunde", href: "/kunden/neu", icon: Users },
  { label: "Neue Anfrage", href: "/anfragen/neu", icon: Inbox },
  { label: "Neues Angebot", href: "/angebote/neu", icon: FileText },
  { label: "Neuer Auftrag", href: "/arbeit/neu", icon: Briefcase },
  { label: "Neue Rechnung", href: "/finanzen/neu", icon: Wallet },
  { label: "Neuer Termin", href: "/termine", icon: Calendar },
  { label: "Neue Aufgabe", href: "/aufgaben", icon: ListTodo },
];

const TYPE_LABELS: Record<string, string> = { FEATURE: "Funktion", VERSION: "Version" };

function AnnouncementDetailModal({ item, onClose }: { item: AnnouncementItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="rounded-card border border-ink-100 bg-surface p-5 shadow-cardHover space-y-3 max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="text-xs font-medium text-brand-700">{TYPE_LABELS[item.type] ?? item.type}</span>
            <h3 className="font-display font-semibold text-ink-900 mt-0.5">{item.title}</h3>
          </div>
          <button onClick={onClose} className="shrink-0 p-1 text-ink-300 hover:text-ink-700 transition-colors" aria-label="Schließen">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-ink-700 whitespace-pre-wrap">{item.body}</p>
      </div>
    </div>
  );
}

export function TopBar({
  announcements,
  hasUnseen,
  latestVersion,
  isAdmin,
  updateRequestedAt,
}: {
  announcements: AnnouncementItem[];
  hasUnseen: boolean;
  latestVersion: LatestVersion;
  isAdmin: boolean;
  updateRequestedAt: Date | null;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const newMenuRef = useRef<HTMLDivElement>(null);

  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const [unseen, setUnseen] = useState(hasUnseen);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementItem | null>(null);
  const [requestedAt, setRequestedAt] = useState(updateRequestedAt);
  const [requestPending, startRequestTransition] = useTransition();

  // "Update anfordern" nur, wenn es ueberhaupt eine Versions-Ankuendigung
  // gibt UND diese neuer ist als die letzte Anfrage dieser Firma -- sonst
  // laeuft man ja schon auf der aktuellsten Version.
  const newVersionAvailable = latestVersion && (!requestedAt || latestVersion.publishedAt > requestedAt);

  const initials = session?.user?.name
    ? session.user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()
    : "..";

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/suche?q=${encodeURIComponent(query.trim())}`);
  }

  function toggleBell() {
    const opening = !bellOpen;
    setBellOpen(opening);
    if (opening && unseen) {
      setUnseen(false);
      markAnnouncementsSeen().then(() => router.refresh());
    }
  }

  function handleRequestUpdate() {
    if (!confirm("Update bei TaskOrga anfordern? Der Betreiber wird per E-Mail benachrichtigt.")) return;
    startRequestTransition(async () => {
      await requestUpdate();
      setRequestedAt(new Date());
      router.refresh();
    });
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) {
        setNewMenuOpen(false);
      }
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-16 shrink-0 border-b border-ink-100 bg-surface flex items-center justify-between gap-4 px-4 md:px-6">
      <div className="flex items-center gap-3 flex-1 min-w-0 max-w-2xl">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <button
              type="submit"
              aria-label="Suchen"
              className="absolute left-3 top-1/2 -translate-y-1/2 p-1 rounded text-ink-300 hover:text-brand-600 transition-colors"
            >
              <Search size={18} />
            </button>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Suchen … z. B. „Müller Wallbox Februar“"
              className="w-full rounded-lg border border-ink-100 bg-ink-50 py-2.5 pl-10 pr-3 text-sm placeholder:text-ink-300 focus:bg-surface focus:border-brand-500 outline-none transition-colors"
            />
          </div>
        </form>

        <div ref={newMenuRef} className="relative">
          <button
            onClick={() => setNewMenuOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-500 text-white text-sm font-medium px-3 sm:px-3.5 py-2 hover:bg-brand-600 transition-colors shrink-0"
            aria-label="Neu anlegen"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Neu</span>
          </button>

          {newMenuOpen && (
            <div className="absolute right-0 mt-1 w-56 rounded-lg border border-ink-100 bg-surface shadow-cardHover py-1.5 z-30">
              {NEW_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    onClick={() => setNewMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-ink-700 hover:bg-ink-50 transition-colors"
                  >
                    <Icon size={15} className="text-ink-300" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
      <div ref={bellRef} className="relative">
        <button
          onClick={toggleBell}
          className="relative rounded-lg p-2 text-ink-500 hover:bg-ink-50 hover:text-ink-900 transition-colors"
          aria-label="Benachrichtigungen"
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 flex h-1.5 w-1.5">
            {unseen && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-turquoise-400 opacity-75" />
            )}
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-turquoise-500" />
          </span>
        </button>

        {bellOpen && (
          <div className="absolute right-0 mt-1 w-72 rounded-lg border border-ink-100 bg-surface shadow-cardHover py-1.5 z-30">
            <div className="px-3.5 pb-1.5 text-xs font-medium text-ink-500">Neuigkeiten</div>
            {announcements.length === 0 ? (
              <p className="px-3.5 py-2 text-sm text-ink-300">Noch keine Ankündigungen.</p>
            ) : (
              <div className="max-h-72 overflow-y-auto">
                {announcements.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedAnnouncement(item);
                      setBellOpen(false);
                    }}
                    className="flex w-full items-start gap-2 px-3.5 py-2 text-left hover:bg-ink-50 transition-colors"
                  >
                    <Megaphone size={14} className="mt-0.5 shrink-0 text-ink-300" />
                    <span className="min-w-0">
                      <span className="block text-xs text-ink-500">{TYPE_LABELS[item.type] ?? item.type}</span>
                      <span className="block text-sm text-ink-900 truncate">{item.teaser}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {isAdmin && latestVersion && (
              <div className="mt-1 border-t border-ink-100 px-3.5 pt-2">
                {newVersionAvailable ? (
                  <button
                    disabled={requestPending}
                    onClick={handleRequestUpdate}
                    className="py-1 text-xs font-medium text-brand-700 hover:underline disabled:opacity-60"
                  >
                    {requestPending ? "Wird gesendet …" : `Update anfordern (Version ${latestVersion.version})`}
                  </button>
                ) : (
                  <p className="py-1 text-xs text-ink-300">
                    Du nutzt bereits die aktuellste Version ({latestVersion.version}).
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedAnnouncement && (
        <AnnouncementDetailModal item={selectedAnnouncement} onClose={() => setSelectedAnnouncement(null)} />
      )}

      <Link
        href="/einstellungen"
        className="h-9 w-9 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-medium font-display hover:bg-slate-900 transition-colors"
        aria-label="Mein Profil"
        title="Mein Profil"
      >
        {initials}
      </Link>

      <button
        onClick={() => signOut({ callbackUrl: process.env.NEXT_PUBLIC_MARKETING_URL || "/login" })}
        className="rounded-lg p-2 text-ink-500 hover:bg-ink-50 hover:text-danger transition-colors"
        aria-label="Abmelden"
        title="Abmelden"
      >
        <LogOut size={18} />
      </button>
      </div>
    </header>
  );
}
