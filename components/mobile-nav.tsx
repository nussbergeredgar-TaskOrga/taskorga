"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Users,
  Inbox,
  Briefcase,
  Wallet,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Auf dem Handy ist wenig Platz: die 5 wichtigsten Workspaces direkt,
// Einblicke/Einstellungen unter "Mehr".
const primaryItems = [
  { href: "/heute", label: "Heute", icon: LayoutGrid },
  { href: "/kunden", label: "Kunden", icon: Users },
  { href: "/anfragen", label: "Anfragen", icon: Inbox },
  { href: "/arbeit", label: "Arbeit", icon: Briefcase },
  { href: "/finanzen", label: "Finanzen", icon: Wallet },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-ink-100 pb-[env(safe-area-inset-bottom)]"
      aria-label="Hauptnavigation"
    >
      <div className="flex items-stretch">
        {primaryItems.map((item) => {
          const active = pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
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
        <Link
          href="/einstellungen"
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
            pathname?.startsWith("/einstellungen") || pathname?.startsWith("/einblicke") || pathname?.startsWith("/termine")
              ? "text-brand-600"
              : "text-ink-300"
          )}
        >
          <MoreHorizontal size={20} />
          Mehr
        </Link>
      </div>
    </nav>
  );
}
