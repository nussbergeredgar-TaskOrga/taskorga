export type HelpChapter = {
  id: string;
  title: string;
  description: string;
  paragraphs: string[]; // **wort** wird beim Rendern fett dargestellt
};

export const HELP_CHAPTERS: HelpChapter[] = [
  {
    id: "erste-schritte",
    title: "Erste Schritte",
    description: "Registrierung, Login, Navigation.",
    paragraphs: [
      "Ein neues Firmenkonto legst du unter „Jetzt kostenlos registrieren\" auf der Login-Seite an. Du brauchst dafür einen Einladungscode (den bekommst du von deinem Admin). Dein Konto ist danach komplett von allen anderen Firmen getrennt — niemand sonst sieht deine Daten.",
      "Unter **Einstellungen → Mein Konto → Meine Navigation** kannst du festlegen, welche Menüpunkte bei dir angezeigt werden und in welcher Reihenfolge — das ist eine persönliche Einstellung, jeder Nutzer kann sie individuell anpassen.",
      "Passwort vergessen? Auf der Login-Seite auf „Passwort vergessen?\" klicken. Falls der E-Mail-Versand noch nicht eingerichtet ist, kann ein Admin dein Passwort auch direkt unter Einstellungen → Firma → Benutzerverwaltung zurücksetzen.",
    ],
  },
  {
    id: "kunden",
    title: "Kunden",
    description: "Anlegen, bearbeiten, Ansprechpartner, Tabs anpassen.",
    paragraphs: [
      "Bei **Privatkunden** trägst du Anrede, Vor- und Nachname getrennt ein — der Anzeigename wird automatisch daraus gebildet. Bei **Geschäftskunden** gibst du direkt den Firmennamen ein.",
      "Über den Bearbeiten-Button im Kundenprofil lassen sich alle Stammdaten jederzeit ändern.",
      "Welche Tabs im Kundenprofil angezeigt werden (Übersicht, Timeline, Anfragen, …) und in welcher Reihenfolge, legt ein Admin unter **Einstellungen → Anfragen & Vertrieb → Kundenstamm-Tabs** fest — gilt dann für alle Nutzer der Firma.",
    ],
  },
  {
    id: "anfragen",
    title: "Anfragen",
    description: "Workflow, Status, Notizen, Gewonnen/Verloren.",
    paragraphs: [
      "Die Schritte des Anfragen-Workflows (z. B. „Rückruf geplant\", „Angebot erstellt\") legt ein Admin unter **Einstellungen → Anfragen & Vertrieb** fest — umbenennbar, erweiterbar, in beliebiger Reihenfolge.",
      "In der Übersicht kannst du direkt in der Zeile eine Notiz zum aktuellen Schritt eintragen und mit einem Klick auf „Erledigt\" zum nächsten Schritt springen. Beim Anlegen einer Anfrage kannst du einen noch nicht vorhandenen Kunden direkt inline anlegen, ohne den Vorgang abzubrechen.",
      "Sind alle Schritte abgehakt, musst du dich aktiv für **Gewonnen** oder **Verloren** entscheiden — der Status auf der Detailseite bleibt dabei immer synchron mit der Übersicht.",
      "Über den Umschalter oben kannst du zwischen der Ansicht „Nach Workflow-Schritt\" und einer chronologischen, filterbaren **Listenansicht** wechseln.",
    ],
  },
  {
    id: "angebote",
    title: "Angebote",
    description: "Positionen, MwSt., Rabatte, Bibliothek, Versionierung.",
    paragraphs: [
      "Jede Position kann einen eigenen MwSt.-Satz haben (19 %/7 %/0 %, Standard 19 %). In der **Positions-Bibliothek** (Einstellungen → Dokumente & Finanzen) kannst du häufig genutzte Positionen vorab anlegen und beim Angebot direkt einfügen — oder einmalig frei eintippen, ohne zu speichern.",
      "Rabatte lassen sich als fester Betrag oder als Prozentsatz vom Nettobetrag angeben; welche Variante standardmäßig vorausgewählt ist, stellst du unter Einstellungen ein.",
      "Die Standard-Gültigkeitsdauer (Tage) und das Nummernformat (z. B. ANG-{YYYY}-{NNNN}) legst du ebenfalls dort fest.",
      "Ein Angebot kann vor dem Versand **versioniert** werden — die Versionshistorie ist auf der Angebots-Detailseite einsehbar.",
      "Über den **Vorschau**-Button siehst du das PDF direkt in der App, bevor du versendest. Beim Klick auf „Per E-Mail senden\" fragt die App nochmal nach und bietet dir „Zur Vorschau\" oder „Direkt versenden\" an.",
    ],
  },
  {
    id: "termine",
    title: "Termine",
    description: "Kalender, Terminarten, Doppelklick, Listenansicht.",
    paragraphs: [
      "Ein Doppelklick auf einen Kalendertag öffnet direkt das Termin-Formular mit vorausgefülltem Datum. Datum und Uhrzeit werden über getrennte Felder eingegeben.",
      "Welche Terminarten zur Auswahl stehen, legt ein Admin unter **Einstellungen → Anfragen & Vertrieb → Terminarten** fest.",
      "Neben dem Kalender gibt es eine chronologische, filterbare **Listenansicht** aller Termine sowie eine reine Monatsansicht — beide lassen sich einzeln ein-/ausklappen.",
      "Jeder Termin hat eine eigene Detailseite mit Notizen und verknüpfbaren Aufgaben.",
    ],
  },
  {
    id: "arbeit",
    title: "Arbeit (Aufträge)",
    description: "Direkt anlegen, aus Angebot, Zeiterfassung.",
    paragraphs: [
      "Ein Auftrag entsteht entweder automatisch, wenn ein Angebot angenommen wird, oder du legst ihn direkt an (Button „Neuer Auftrag\").",
      "Auf der Auftrags-Detailseite kannst du Aufgaben verwalten, die Zeit erfassen (Stunden/Minuten je Eintrag) und eine Rechnung mit denselben Positionen wie im Angebot erstellen.",
    ],
  },
  {
    id: "rechnungen",
    title: "Rechnungen & Mahnwesen",
    description: "Erstellen, Versand, Erinnerungsstufen.",
    paragraphs: [
      "Rechnungen entstehen aus einem Auftrag. Auf der Detailseite kannst du sie per E-Mail versenden (inkl. Vorschau/Bestätigung wie bei Angeboten), als bezahlt markieren oder eine Zahlungserinnerung/Mahnung anstoßen.",
      "Überfällige Rechnungen werden automatisch markiert und erscheinen im roten „Mahnwesen\"-Bereich auf der Finanzen-Seite. Welche Mahnstufen es gibt, ab wann sie sinnvoll sind und welcher Text verschickt wird, legst du unter **Einstellungen → Dokumente & Finanzen → Mahnwesen** fest.",
    ],
  },
  {
    id: "aufgaben",
    title: "Aufgaben",
    description: "Frei erstellen, mit Datensätzen verknüpfen.",
    paragraphs: [
      "Unter dem Menüpunkt **Aufgaben** siehst du alle Aufgaben deiner Firma, filterbar nach Status. Neue Aufgaben können völlig frei erstellt werden — mit Fälligkeit, Priorität, Zuständigkeit, optional einem Kunden und optional einem verknüpften Datensatz (Anfrage, Angebot, Auftrag, Rechnung oder Termin).",
      "Zusätzlich kannst du direkt aus jedem Termin, Angebot, Rechnung oder Kundenprofil heraus eine Aufgabe anlegen, die automatisch mit diesem Datensatz verknüpft wird.",
    ],
  },
  {
    id: "einblicke",
    title: "Einblicke & Kunden-Radar",
    description: "Diagramme, eigene Kennzahlen, Signale.",
    paragraphs: [
      "Unter **Einblicke** findest du feste Diagramme (Umsatzverlauf, Rechnungsstatus, Anfragen-Pipeline) sowie eigene Kennzahlen-Kacheln: Datentyp, Berechnung (Anzahl/Betrag), optionaler Status-Filter und ein Zeitfenster (Heute, diese Woche, dieser Monat, dieses Jahr oder ein fester Zeitraum). Über das Stift-Symbol lässt sich jede Kennzahl nachträglich bearbeiten.",
      "Der **Kunden-Radar** zeigt automatisch Kunden, die lange keinen Kontakt hatten, oder bei denen die Terminfrequenz gegenüber dem Vorjahr zurückgegangen ist — gut zum Nachfassen. Im Kundenprofil kann außerdem eine KI-Cross-Selling-Empfehlung generiert werden.",
    ],
  },
  {
    id: "einstellungen-ueberblick",
    title: "Einstellungen im Überblick",
    description: "Die vier Bereiche.",
    paragraphs: [
      "**Mein Konto** — Profil, Passwort, Systemeinstellungen (Farbmodus & Schriftgröße persönlich, App-Akzentfarbe firmenweit für Admins), eigene Navigation (jeder Nutzer für sich).",
      "**Firma** — Firmenprofil, Logo, Benutzerverwaltung, Menü-Wording, E-Mail-Signatur (nur Admin).",
      "**Anfragen & Vertrieb** — Anfragen-Workflow, Kundenstamm-Tabs, Terminarten (nur Admin).",
      "**Dokumente & Finanzen** — Angebots-/Rechnungsvorlagen, Positions-Bibliothek, Mahnstufen, Grundeinstellungen für Nummernformate und Rabatte (nur Admin).",
    ],
  },
  {
    id: "email-einrichten",
    title: "E-Mail-Versand einrichten (Resend-API-Key)",
    description: "Nötig, damit Angebote, Rechnungen, Mahnungen und Passwort-Reset-Mails wirklich verschickt werden.",
    paragraphs: [
      "TaskOrga nutzt den E-Mail-Dienst **Resend** für den Versand. Ohne eingerichteten API-Key funktioniert die App weiterhin normal — nur der tatsächliche E-Mail-Versand zeigt dann eine Fehlermeldung.",
      "1. Kostenloses Konto auf resend.com anlegen (100 E-Mails/Tag gratis).",
      "2. Im Resend-Dashboard unter „API Keys\" einen neuen Key erstellen und kopieren.",
      "3. Bei Vercel im Projekt unter Settings → Environment Variables eine neue Variable anlegen: RESEND_API_KEY = dein-key-von-resend",
      "4. Optional: eine eigene Absenderadresse mit EMAIL_FROM hinterlegen (z. B. TaskOrga <info@deine-domain.de>), dafür muss die Domain vorher bei Resend verifiziert werden. Ohne diese Variable wird eine Resend-Testadresse verwendet.",
      "5. Nach dem Speichern der Umgebungsvariable: „Deployments\" → neuestes Deployment → „...\" → „Redeploy\", damit die Änderung übernommen wird.",
    ],
  },
  {
    id: "ki-einrichten",
    title: "KI-Funktionen einrichten (Anthropic-API-Key)",
    description: "Für die Cross-Selling-Empfehlungen im Kundenprofil.",
    paragraphs: [
      "Die KI-Vorschläge im Kundenprofil nutzen die Anthropic-API (Claude). Ohne eingerichteten Key zeigt der Button eine klare Fehlermeldung, der Rest der App funktioniert normal weiter.",
      "1. Konto auf console.anthropic.com anlegen, etwas Guthaben aufladen.",
      "2. Unter „API Keys\" einen neuen Key erstellen.",
      "3. Bei Vercel als Umgebungsvariable eintragen: ANTHROPIC_API_KEY = dein-key",
      "4. Danach neu deployen („Redeploy\").",
    ],
  },
  {
    id: "team-zugriff",
    title: "Team & Zugriff",
    description: "Benutzerverwaltung, Einladungscodes, Rollen.",
    paragraphs: [
      "Neue Nutzer für deine Firma legst du unter **Einstellungen → Firma → Benutzerverwaltung** an. Es gibt zwei Rollen: Admin (voller Zugriff, inkl. Finanzen und Einblicke) und Mitarbeiter (ohne Finanzbereich). Ein Admin kann dort auch das Passwort eines Nutzers zurücksetzen.",
      "Neue Firmenkonten (also komplett neue, getrennte Firmen) entstehen nur über die Registrierungsseite mit einem gültigen Einladungscode. Diese Codes werden über eine separate, mit Master-Passwort geschützte Seite unter /plattform-admin verwaltet — dort lassen sich Codes mit Notiz und Nutzungslimit erstellen und wieder löschen.",
    ],
  },
  {
    id: "vorlagen-signatur",
    title: "PDF-Vorlagen & Signatur",
    description: "Eigenes Design für Angebote/Rechnungen.",
    paragraphs: [
      "Unter Einstellungen → Dokumente & Finanzen lassen sich mehrere Vorlagen je Typ (Angebot/Rechnung) anlegen, mit Einleitungs- und Fußzeilentext. Darin können Platzhalter wie {{kunde.anrede}} oder {{dokument.brutto}} verwendet werden — sie werden beim Erstellen automatisch mit echten Daten gefüllt, inklusive korrekter Anrede je nach Geschlecht des Kunden.",
      "Die **E-Mail-Signatur** (Einstellungen → Firma) erscheint automatisch unter jeder aus dem System versendeten E-Mail — Logo und Firmenname kommen dabei automatisch aus dem Firmenprofil.",
    ],
  },
];
