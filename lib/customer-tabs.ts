export type CustomerTabConfig = { id: string; visible: boolean; order: number };

export const CUSTOMER_TAB_CATALOG: { id: string; label: string }[] = [
  { id: "uebersicht", label: "Übersicht" },
  { id: "timeline", label: "Timeline" },
  { id: "anfragen", label: "Anfragen" },
  { id: "angebote", label: "Angebote" },
  { id: "auftraege", label: "Aufträge" },
  { id: "rechnungen", label: "Rechnungen" },
  { id: "termine", label: "Termine" },
  { id: "dokumente", label: "Dokumente" },
  { id: "aufgaben", label: "Aufgaben" },
  { id: "finanzen", label: "Finanzen" },
];

const DEFAULT_ORDER = [
  "uebersicht",
  "timeline",
  "anfragen",
  "angebote",
  "auftraege",
  "rechnungen",
  "termine",
  "dokumente",
  "aufgaben",
  "finanzen",
];

export const DEFAULT_CUSTOMER_TABS: CustomerTabConfig[] = DEFAULT_ORDER.map((id, i) => ({
  id,
  visible: true,
  order: i,
}));
