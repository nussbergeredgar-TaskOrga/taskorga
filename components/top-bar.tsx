"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Bell, Plus, LogOut, Users, Inbox, FileText, Briefcase, Calendar, ListTodo, Wallet } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

const NEW_ITEMS = [
  { label: "Neuer Kunde", href: "/kunden/neu", icon: Users },
  { label: "Neue Anfrage", href: "/anfragen/neu", icon: Inbox },
  { label: "Neues Angebot", href: "/angebote/neu", icon: FileText },
  { label: "Neuer Auftrag", href: "/arbeit/neu", icon: Briefcase },
  { label: "Neue Rechnung", href: "/finanzen/neu", icon: Wallet },
  { label: "Neuer Termin", href: "/termine", icon: Calendar },
  { label: "Neue Aufgabe", href: "/aufgaben", icon: ListTodo },
];

export function TopBar() {
  const { data: session } = useSession();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const newMenuRef = useRef<HTMLDivElement>(null);

  const initials = session?.user?.name
    ? session.user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()
    : "..";

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/suche?q=${encodeURIComponent(query.trim())}`);
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) {
        setNewMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-16 shrink-0 border-b border-ink-100 bg-surface flex items-center gap-4 px-4 md:px-6">
      <form onSubmit={handleSearch} className="flex-1 max-w-xl">
        <div className="relative">
          <button
            type="submit"
            aria-label="Suchen"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-ink-300 hover:text-brand-600 transition-colors"
          >
            <Search size={16} />
          </button>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suchen … z. B. „Müller Wallbox Februar“"
            className="w-full rounded-lg border border-ink-100 bg-ink-50 py-2 pl-9 pr-3 text-sm placeholder:text-ink-300 focus:bg-surface focus:border-brand-500 outline-none transition-colors"
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

      <button
        className="relative rounded-lg p-2 text-ink-500 hover:bg-ink-50 hover:text-ink-900 transition-colors"
        aria-label="Benachrichtigungen"
      >
        <Bell size={18} />
        <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-turquoise-500" />
      </button>

      <Link
        href="/einstellungen"
        className="h-9 w-9 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-medium font-display hover:bg-slate-900 transition-colors"
        aria-label="Mein Profil"
        title="Mein Profil"
      >
        {initials}
      </Link>

      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="rounded-lg p-2 text-ink-500 hover:bg-ink-50 hover:text-danger transition-colors"
        aria-label="Abmelden"
        title="Abmelden"
      >
        <LogOut size={18} />
      </button>
    </header>
  );
}
