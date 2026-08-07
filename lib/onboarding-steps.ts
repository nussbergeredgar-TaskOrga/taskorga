export type TourStep = {
  id: string;
  route: string;
  // data-tour-Selektor des Zielelements; fehlt bei reinen Infoschritten (Blase
  // erscheint dann mittig, kein abgedunkelter Rahmen um ein Zielelement).
  target?: string;
  // Fuer Schritte mit target: welches reportAction(type) diesen Schritt
  // abschliesst. Ohne target: der Klick auf den cta-Button selbst ist die Aktion.
  requiredEvent?: string;
  // Nur relevant fuer Schritte, deren Zielelement nur im Bearbeiten-Modus des
  // Dashboards existiert -- signalisiert DashboardGrid beim Fortsetzen der Tour
  // nach einem Reload, den Bearbeiten-Modus selbst zu aktivieren.
  requiresEditMode?: boolean;
  title: string;
  body: string;
  cta?: string;
};

// Admin-Tour: der selbst registrierte Erstnutzer lernt, das Dashboard zu
// bearbeiten (Kachel verschieben/Groesse aendern) und eine eigene Kennzahl
// anzulegen. Schritt 3/4 zeigen bewusst auf feste Kachel-IDs statt "erste
// sichtbare Kachel" -- sonst wuerde Schritt 4 nach dem Verschieben in Schritt 3
// auf die falsche Kachel zeigen.
export const ADMIN_TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    route: "/heute",
    title: "Willkommen bei TaskOrga!",
    body: "Das ist dein Dashboard. Hier siehst du auf einen Blick die wichtigsten Zahlen deines Unternehmens.",
    cta: "Los geht's",
  },
  {
    id: "edit-mode",
    route: "/heute",
    target: "dashboard-edit-toggle",
    requiredEvent: "editModeOn",
    title: "Dein Dashboard, deine Regeln",
    body: "Über „Dashboard anpassen“ gestaltest du dein Dashboard nach deinen Wünschen. Klick drauf, um zu starten.",
  },
  {
    id: "move-tile",
    route: "/heute",
    target: "tile-move-kpi-offene-aufgaben",
    requiredEvent: "tileMoved",
    requiresEditMode: true,
    title: "Position ändern",
    body: "Verschiebe diese Kachel testweise mit den Pfeilen an eine andere Stelle.",
  },
  {
    id: "resize-tile",
    route: "/heute",
    target: "tile-resize-kpi-umsatz-monat",
    requiredEvent: "tileResized",
    requiresEditMode: true,
    title: "Größe ändern",
    body: "Klick auf das Größen-Symbol, um die Kachel größer oder kleiner zu machen.",
  },
  {
    id: "goto-einblicke",
    route: "/heute",
    title: "Eigene Kennzahlen",
    body: "Stark! Als Nächstes erstellst du eine eigene Kennzahl. Weiter geht's auf der Seite „Einblicke“.",
    cta: "Weiter zu Einblicke",
  },
  {
    id: "create-kpi",
    route: "/einblicke",
    target: "kpi-create-button",
    requiredEvent: "kpiCreated",
    title: "Kennzahl erstellen",
    body: "Klick auf „Neue Kennzahl erstellen“, gib ihr einen Namen und speichere sie.",
  },
  {
    id: "add-kpi-to-dashboard",
    route: "/einblicke",
    target: "kpi-dashboard-toggle",
    requiredEvent: "kpiAddedToDashboard",
    title: "Aufs Dashboard holen",
    body: "Füge deine neue Kennzahl jetzt deinem Dashboard hinzu.",
  },
  {
    id: "done",
    route: "/einblicke",
    title: "Geschafft!",
    body: "Du kennst jetzt die wichtigsten Grundlagen. Viel Erfolg mit TaskOrga!",
    cta: "Zum Dashboard",
  },
];

// Mitarbeiter-Tour: kurzer Rundgang durch die Hauptbereiche fuer von einem
// Admin eingeladene Teammitglieder. Bewusst keine Dateneingriffe (kein Kunde/
// keine Anfrage anlegen) -- hier wird im echten Firmen-Datenbestand gearbeitet.
// Zielelemente sind die Navigationspunkte (data-tour="nav-<id>" aus
// lib/nav-items.ts), der Seitenwechsel selbst ist die geforderte Aktion.
export const MEMBER_TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    route: "/heute",
    title: "Willkommen bei TaskOrga!",
    body: "Kurzer Rundgang durch die wichtigsten Bereiche.",
    cta: "Los geht's",
  },
  {
    id: "dashboard",
    route: "/heute",
    target: "nav-heute",
    title: "Dashboard",
    body: "Das ist dein Dashboard – die wichtigsten Zahlen auf einen Blick.",
    cta: "Weiter",
  },
  {
    id: "kunden",
    route: "/kunden",
    target: "nav-kunden",
    title: "Kontakte",
    body: "Hier verwaltest du deine Kunden – Kontaktdaten, Historie, alles an einem Ort.",
  },
  {
    id: "anfragen",
    route: "/anfragen",
    target: "nav-anfragen",
    title: "Anfragen",
    body: "Neue Anfragen von Interessenten landen hier – von der ersten Kontaktaufnahme bis zum Angebot.",
  },
  {
    id: "angebote",
    route: "/angebote",
    target: "nav-angebote",
    title: "Angebote",
    body: "Hier erstellst und verwaltest du Angebote für deine Kunden.",
  },
  {
    id: "termine",
    route: "/termine",
    target: "nav-termine",
    title: "Termine",
    body: "Dein Kalender – Termine anlegen, Zuständigkeiten verteilen.",
  },
  {
    id: "done",
    route: "/termine",
    title: "Fertig!",
    body: "Das waren die wichtigsten Bereiche. Viel Erfolg!",
    cta: "Los geht's",
  },
];
