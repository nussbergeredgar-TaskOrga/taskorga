"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_CATALOG, type NavItemConfig } from "@/lib/nav-items";
import { ICON_MAP } from "@/lib/nav-icons";

export function NavSidebar({ config, labels }: { config: NavItemConfig[]; labels?: Record<string, string> }) {
  const pathname = usePathname();
  const byId = new Map(NAV_CATALOG.map((c) => [c.id, c]));
  const visible = [...config].filter((c) => c.visible).sort((a, b) => a.order - b.order);

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:shrink-0 border-r border-ink-100 bg-surface">
      <div className="h-16 flex items-center px-6">
        <span className="font-display font-semibold text-lg text-ink-900">
          TaskOrga
        </span>
      </div>
      <nav className="flex-1 px-3 py-2 space-y-1">
        {visible.map((c) => {
          const item = byId.get(c.id);
          if (!item) return null;
          const active = pathname?.startsWith(item.href);
          const Icon = ICON_MAP[item.icon];
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-ink-500 hover:bg-ink-50 hover:text-ink-900"
              )}
            >
              <Icon size={18} strokeWidth={2} />
              {labels?.[item.id] || item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
