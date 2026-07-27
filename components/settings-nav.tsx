"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/einstellungen", label: "Mein Konto", adminOnly: false },
  { href: "/einstellungen/firma", label: "Firma", adminOnly: true },
  { href: "/einstellungen/vertrieb", label: "Anfragen & Vertrieb", adminOnly: true },
  { href: "/einstellungen/dokumente", label: "Dokumente & Finanzen", adminOnly: true },
];

export function SettingsNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const visible = TABS.filter((t) => !t.adminOnly || isAdmin);

  return (
    <div className="flex gap-1 border-b border-ink-100 overflow-x-auto">
      {visible.map((tab) => {
        const active =
          tab.href === "/einstellungen" ? pathname === "/einstellungen" : pathname?.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
              active
                ? "border-brand-500 text-brand-700"
                : "border-transparent text-ink-500 hover:text-ink-900"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
