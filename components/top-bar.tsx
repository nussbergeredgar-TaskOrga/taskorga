"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, Plus, LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

export function TopBar() {
  const { data: session } = useSession();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const initials = session?.user?.name
    ? session.user.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()
    : "..";

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/suche?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <header className="h-16 shrink-0 border-b border-ink-100 bg-white flex items-center gap-4 px-4 md:px-6">
      <form onSubmit={handleSearch} className="flex-1 max-w-xl">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suchen … z. B. „Müller Wallbox Februar“"
            className="w-full rounded-lg border border-ink-100 bg-ink-50 py-2 pl-9 pr-3 text-sm placeholder:text-ink-300 focus:bg-white focus:border-brand-500 outline-none transition-colors"
          />
        </div>
      </form>

      <button
        className="hidden sm:flex items-center gap-1.5 rounded-lg bg-brand-500 text-white text-sm font-medium px-3.5 py-2 hover:bg-brand-600 transition-colors"
        aria-label="Neu anlegen"
      >
        <Plus size={16} />
        Neu
      </button>

      <button
        className="relative rounded-lg p-2 text-ink-500 hover:bg-ink-50 hover:text-ink-900 transition-colors"
        aria-label="Benachrichtigungen"
      >
        <Bell size={18} />
        <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-turquoise-500" />
      </button>

      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="group relative h-9 w-9 rounded-full bg-ink-700 text-white flex items-center justify-center text-xs font-medium font-display hover:bg-ink-900 transition-colors"
        aria-label="Abmelden"
        title="Abmelden"
      >
        <span className="group-hover:opacity-0 transition-opacity">{initials}</span>
        <LogOut size={14} className="absolute opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    </header>
  );
}
