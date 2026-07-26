"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Users,
  Inbox,
  Calendar,
  Briefcase,
  Wallet,
  BarChart3,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/heute", label: "Heute", icon: LayoutGrid },
  { href: "/kunden", label: "Kunden", icon: Users },
  { href: "/anfragen", label: "Anfragen", icon: Inbox },
  { href: "/termine", label: "Termine", icon: Calendar },
  { href: "/arbeit", label: "Arbeit", icon: Briefcase },
  { href: "/finanzen", label: "Finanzen", icon: Wallet },
  { href: "/einblicke", label: "Einblicke", icon: BarChart3 },
  { href: "/einstellungen", label: "Einstellungen", icon: Settings },
];

export function NavSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:shrink-0 border-r border-ink-100 bg-surface">
      <div className="h-16 flex items-center px-6">
        <span className="font-display font-semibold text-lg text-ink-900">
          TaskOrga
        </span>
      </div>
      <nav className="flex-1 px-3 py-2 space-y-1">
        {items.map((item) => {
          const active = pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-ink-500 hover:bg-ink-50 hover:text-ink-900"
              )}
            >
              <Icon size={18} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
