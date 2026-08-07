"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_CATALOG, type NavItemConfig } from "@/lib/nav-items";
import { ICON_MAP } from "@/lib/nav-icons";

export function MobileNav({ config, labels }: { config: NavItemConfig[]; labels?: Record<string, string> }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const byId = new Map(NAV_CATALOG.map((c) => [c.id, c]));
  const visible = [...config].filter((c) => c.visible).sort((a, b) => a.order - b.order);
  // Erste 5 sichtbare Punkte direkt im unteren Menü, Rest unter "Mehr"
  const primary = visible.slice(0, 5);
  const overflow = visible.slice(5);
  const overflowActive = overflow.some((c) => {
    const item = byId.get(c.id);
    return item && pathname?.startsWith(item.href);
  });

  // "Mehr"-Menü automatisch schließen, sobald sich die Seite ändert
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  return (
    <>
      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/30"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="absolute bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 bg-surface rounded-t-2xl border-t border-ink-100 shadow-cardHover p-2 pb-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm font-medium text-ink-500">Weitere Bereiche</span>
              <button
                onClick={() => setMoreOpen(false)}
                className="text-ink-300 p-1"
                aria-label="Schließen"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-1">
              {overflow.map((c) => {
                const item = byId.get(c.id);
                if (!item) return null;
                const active = pathname?.startsWith(item.href);
                const Icon = ICON_MAP[item.icon];
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      active ? "bg-brand-50 text-brand-700" : "text-ink-700 hover:bg-ink-50"
                    )}
                  >
                    <Icon size={18} />
                    {labels?.[item.id] || item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-ink-100 pb-[env(safe-area-inset-bottom)]"
        aria-label="Hauptnavigation"
      >
        <div className="flex items-stretch">
          {primary.map((c) => {
            const item = byId.get(c.id);
            if (!item) return null;
            const active = pathname?.startsWith(item.href);
            const Icon = ICON_MAP[item.icon];
            return (
              <Link
                key={item.id}
                href={item.href}
                data-tour={`nav-${item.id}`}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-brand-600" : "text-ink-300"
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                {labels?.[item.id] || item.label}
              </Link>
            );
          })}
          {overflow.length > 0 && (
            <button
              onClick={() => setMoreOpen((o) => !o)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
                overflowActive || moreOpen ? "text-brand-600" : "text-ink-300"
              )}
            >
              <MoreHorizontal size={20} />
              Mehr
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
