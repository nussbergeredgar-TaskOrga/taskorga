export type NavItemConfig = { id: string; visible: boolean; order: number };

export const NAV_CATALOG: { id: string; label: string; href: string; icon: string }[] = [
  { id: "heute", label: "Heute", href: "/heute", icon: "LayoutGrid" },
  { id: "kunden", label: "Kunden", href: "/kunden", icon: "Users" },
  { id: "anfragen", label: "Anfragen", href: "/anfragen", icon: "Inbox" },
  { id: "angebote", label: "Angebote", href: "/angebote", icon: "FileText" },
  { id: "aufgaben", label: "Aufgaben", href: "/aufgaben", icon: "ListTodo" },
  { id: "termine", label: "Termine", href: "/termine", icon: "Calendar" },
  { id: "arbeit", label: "Arbeit", href: "/arbeit", icon: "Briefcase" },
  { id: "finanzen", label: "Finanzen", href: "/finanzen", icon: "Wallet" },
  { id: "kunden-radar", label: "Kunden-Radar", href: "/kunden-radar", icon: "Radar" },
  { id: "einblicke", label: "Einblicke", href: "/einblicke", icon: "BarChart3" },
  { id: "einstellungen", label: "Einstellungen", href: "/einstellungen", icon: "Settings" },
];

// Standard-Reihenfolge: Termine ist bewusst unter den ersten 5, damit es auf
// dem Handy direkt im unteren Menü sichtbar ist (nicht erst unter "Mehr").
const DEFAULT_ORDER = [
  "heute",
  "kunden",
  "anfragen",
  "termine",
  "arbeit",
  "angebote",
  "aufgaben",
  "finanzen",
  "kunden-radar",
  "einblicke",
  "einstellungen",
];

export const DEFAULT_NAV: NavItemConfig[] = DEFAULT_ORDER.map((id, i) => ({
  id,
  visible: true,
  order: i,
}));
