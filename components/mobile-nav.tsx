"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_CATALOG, type NavItemConfig } from "@/lib/nav-items";
import { ICON_MAP } from "@/lib/nav-icons";

export function MobileNav({ config }: { config: NavItemConfig[] }) {
  const pathname = usePathname();
  const byId = new Map(NAV_CATALOG.map((c) => [c.id, c]));
  const visible = [...config].filter((c) => c.visible).sort((a, b) => a.order - b.order);
  // Erste 5 sichtbare Punkte direkt im unteren Menü, Rest unter "Mehr"
  const primary = visible.slice(0, 5);
  const overflow = visible.slice(5);
  const overflowActive = overflow.some((c) => {
    const item = byId.get(c.id);
    return item && pathname?.startsWith(item.href);
  });

  return (
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
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
                active ? "text-brand-600" : "text-ink-300"
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 2} />
              {item.label}
            </Link>
          );
        })}
        {overflow.length > 0 && (
          <Link
            href="/einstellungen"
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
              overflowActive ? "text-brand-600" : "text-ink-300"
            )}
          >
            <MoreHorizontal size={20} />
            Mehr
          </Link>
        )}
      </div>
    </nav>
  );
}
