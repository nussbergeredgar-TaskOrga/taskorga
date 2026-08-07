export type WidgetSize = "sm" | "md" | "lg";
export type WidgetConfig = {
  id: string;
  visible: boolean;
  size: WidgetSize;
  order: number;
  // Nur für feste KPI-Kacheln (id beginnt mit "kpi-") überschreibbar: eigener
  // Titel/eigene Akzentfarbe statt des eingebauten Standards.
  label?: string;
  accent?: string;
};

export const ACCENT_OPTIONS: { value: string; label: string }[] = [
  { value: "border-l-brand-500", label: "Blau" },
  { value: "border-l-turquoise-500", label: "Türkis" },
  { value: "border-l-success", label: "Grün" },
  { value: "border-l-warning", label: "Gelb" },
  { value: "border-l-danger", label: "Rot" },
];

// Bewusst schlank fuer neue Nutzer -- nur die wichtigsten Zahlen auf den ersten
// Blick, alle uebrigen Kacheln bleiben ueber "Entfernte Kacheln" im
// Bearbeiten-Modus jederzeit erreichbar (siehe WIDGET_LABELS unten, deckt
// weiterhin alle 14 moeglichen Kacheln ab).
export const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: "kpi-umsatz-monat", visible: true, size: "sm", order: 0 },
  { id: "kpi-offene-aufgaben", visible: true, size: "sm", order: 1 },
  { id: "kpi-neue-anfragen", visible: true, size: "sm", order: 2 },
  { id: "kpi-angebote-versendet-betrag", visible: true, size: "sm", order: 3 },
  { id: "widget-offene-aufgaben-liste", visible: true, size: "md", order: 4 },
  { id: "widget-naechste-termine", visible: true, size: "md", order: 5 },
];

export const WIDGET_LABELS: Record<string, string> = {
  "kpi-offene-aufgaben": "Offene Aufgaben",
  "kpi-offene-rechnungen": "Offene Rechnungen",
  "kpi-umsatz-monat": "Umsatz diesen Monat",
  "kpi-neue-anfragen": "Neue Anfragen",
  "kpi-gewonnen-summe": "Gewonnen (Summe)",
  "kpi-verloren-summe": "Verloren (Summe)",
  "kpi-termine-heute": "Heutige Termine",
  "kpi-termine-ausgemacht": "Ausgemachte Termine",
  "kpi-termine-betrag": "Termine Betrag",
  "kpi-angebote-offen": "Offene Angebote",
  "kpi-angebote-versendet-betrag": "Versendete Angebote (Betrag)",
  "widget-offene-aufgaben-liste": "Aufgabenliste",
  "widget-naechste-termine": "Nächste Termine",
  "widget-letzte-aktivitaeten": "Letzte Aktivitäten",
};
