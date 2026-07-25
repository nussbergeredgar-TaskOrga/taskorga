export type WidgetSize = "sm" | "md" | "lg";
export type WidgetConfig = { id: string; visible: boolean; size: WidgetSize; order: number };

export const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: "kpi-offene-aufgaben", visible: true, size: "sm", order: 0 },
  { id: "kpi-offene-rechnungen", visible: true, size: "sm", order: 1 },
  { id: "kpi-umsatz-monat", visible: true, size: "sm", order: 2 },
  { id: "kpi-neue-anfragen", visible: true, size: "sm", order: 3 },
  { id: "kpi-gewonnen-summe", visible: true, size: "sm", order: 4 },
  { id: "kpi-verloren-summe", visible: true, size: "sm", order: 5 },
  { id: "widget-offene-aufgaben-liste", visible: true, size: "md", order: 6 },
  { id: "widget-naechste-termine", visible: true, size: "md", order: 7 },
  { id: "widget-letzte-aktivitaeten", visible: true, size: "md", order: 8 },
];

export const WIDGET_LABELS: Record<string, string> = {
  "kpi-offene-aufgaben": "Offene Aufgaben",
  "kpi-offene-rechnungen": "Offene Rechnungen",
  "kpi-umsatz-monat": "Umsatz diesen Monat",
  "kpi-neue-anfragen": "Neue Anfragen",
  "kpi-gewonnen-summe": "Gewonnen (Summe)",
  "kpi-verloren-summe": "Verloren (Summe)",
  "widget-offene-aufgaben-liste": "Aufgabenliste",
  "widget-naechste-termine": "Nächste Termine",
  "widget-letzte-aktivitaeten": "Letzte Aktivitäten",
};
