# TaskOrga – Projekt-Übergabe an Claude Code

Dies ist ein bereits laufendes, produktives Projekt. Bitte diese Datei komplett lesen,
bevor du mit der Arbeit beginnst — sie beschreibt Stand, Konventionen und offene Punkte.

## Projektstammdaten
- **Lokaler Pfad:** `C:\Users\Edgar Nussberger\Desktop\taskorga`
- **Vercel-Projekt:** taskorga-v2pz — https://taskorga-v2pz.vercel.app
- **GitHub-Repo:** https://github.com/nussbergeredgar-TaskOrga/taskorga.git (main branch)
- **Datenbank:** Neon PostgreSQL
- **Stack:** Next.js 14 App Router, TypeScript, TailwindCSS, Prisma, PostgreSQL (Neon),
  Vercel, Resend (E-Mail), @react-pdf/renderer, recharts, @anthropic-ai/sdk, NextAuth v4
- **Sprache:** Die komplette Oberfläche ist auf Deutsch. Der Nutzer (Edgar) ist
  nicht-technisch — bitte Erklärungen einfach halten, konkrete Schritt-für-Schritt-
  Anleitungen geben (z. B. "Datei X ersetzt Y", "diesen Befehl ausführen").

## Was TaskOrga ist
Eine Multi-Mandanten-SaaS-App für Handwerks-/Dienstleistungsbetriebe (KMU): Kunden,
Anfragen, Angebote, Aufträge, Rechnungen, Termine, Aufgaben, Einblicke/KPIs — jede
Firma (Company) ist vollständig datenisoliert.

## Wichtige Konventionen, die im Projekt durchgängig gelten

1. **SettingsSection-Komponente** (`components/settings-section.tsx`): generischer
   einklappbarer Block mit `title`/`description`/`defaultOpen`/`children`. Wird in
   allen 4 Einstellungsbereichen verwendet. **Alle Bereiche starten eingeklappt**
   (kein `defaultOpen` mehr, war ein bewusster Wunsch des Nutzers).

2. **Feld-Konfigurationssystem** (Pflichtfelder/Ausblenden): `lib/field-config-catalog.ts`
   definiert je Formular (`customer`, `inquiry`, `task`, `appointment`, `quote`) welche
   Felder konfigurierbar sind. `lib/actions/field-config.ts` liefert
   `getFieldConfig(formKey)` / `updateFieldConfig(...)`. Formulare lesen das über einen
   `fc(key)`-Helfer (`{visible, required}`) und rendern/validieren entsprechend — sowohl
   client- als auch serverseitig. Verwaltet unter Einstellungen → Anfragen & Vertrieb.
   **Noch nicht abgedeckt: Rechnung** (hat aktuell kein eigenes Erstellformular, da
   Rechnungen nur aus Aufträgen entstehen).

3. **Achtung bei optionalen Formularfeldern:** Wenn ein Feld je nach Konfiguration
   gar nicht im DOM gerendert wird, liefert `formData.get(key)` `null` (nicht
   `undefined`). Zod-Schemas dafür **immer `.nullish()` statt `.optional()`**
   verwenden — sonst Validierungsfehler "Expected string, received null". Das hat
   in dieser Session mehrfach Bugs verursacht.

4. **KRITISCH — Deutsche Anführungszeichen in JSX-String-Attributen:** Niemals
   `description="Text mit „Wort" drin"` schreiben — das schließende `"` von `„Wort"`
   beendet den umgebenden String vorzeitig und bricht den Build ("Unexpected token
   'div'. Expected jsx identifier", oft an einer ganz anderen, verwirrenden Stelle im
   Fehler-Log). Innerhalb von `"..."`-Attributen entweder **beidseitig** `„...“`
   (echte deutsche Anführungszeichen) verwenden, oder Template-Literals (Backticks)
   nutzen. Vor jedem Commit mit potenziell betroffenen Strings idealerweise mit
   `npx tsc --noEmit` querprüfen.

5. **Datei-Naming:** Neue Dateien/Komponenten in kebab-case, Server Actions in
   `lib/actions/*.ts` mit `"use server"`, generische Datentyp-Kataloge in
   `lib/*-catalog.ts`.

6. **CustomerAutocomplete** (`components/customer-autocomplete.tsx`) ist die
   Standard-Live-Suche für Kundenauswahl in allen Formularen (Aufgaben, Termine,
   Anfragen) — unterstützt `allowCreate` zum Inline-Anlegen neuer Kunden.

7. **Umsatz-Berechnung:** `lib/revenue.ts` → `computeRevenue(companyId, range?,
   customerId?)` — summiert konfigurierbar aus mehreren Quellen (gewonnene Anfragen,
   abgeschlossene Termine, angenommene Angebote, bezahlte Rechnungen), einstellbar
   unter Einstellungen → Dokumente & Finanzen. Wird aktuell genutzt für: Dashboard
   "Umsatz diesen Monat", Kundenprofil "Gesamtumsatz". **Noch nicht umgestellt:**
   Umsatz-Diagramm unter Einblicke (nutzt noch die alte, feste Berechnung).

8. **Bekanntes Deployment-Problem:** Der Nutzer hatte wiederholt Schwierigkeiten,
   Dateien korrekt zu ersetzen (Kopieren über Zwischenablage verschluckte teils
   Anführungszeichen/Schrägstriche). Als Claude Code arbeitest du direkt auf den
   echten Dateien — dieses Problem sollte komplett entfallen. Trotzdem: nach jeder
   Änderung idealerweise `npm run build` lokal laufen lassen, bevor gepusht wird.

## Deployment-Workflow
```
npm install                     # falls neue Pakete
npm run prisma:migrate          # falls Schema geändert (Migrationsname erfragen)
npm run build                   # lokal gegenprüfen, bevor gepusht wird
git add .
git commit -m "..."
git push                        # Vercel deployt automatisch, ca. 2 Min
```

## Env Vars (bei Vercel + lokal in .env)
`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `BLOB_READ_WRITE_TOKEN`,
`RESEND_API_KEY`, `EMAIL_FROM`, `PLATFORM_ADMIN_SECRET`, `ANTHROPIC_API_KEY` (optional,
für KI-Cross-Selling)

## Vollständig umgesetzte Funktionsbereiche (Kurzüberblick, Stand 2026-08-07)
Dashboard (mehrere eigene Dashboards, alle Kacheln — fest wie selbst erstellt —
frei anordenbar/größenveränderbar/ausblendbar, feste KPI-Kacheln mit eigenem
Titel/eigener Akzentfarbe überschreibbar, Klick auf Kachel → gefilterte Liste),
Kunden (CRUD, Anrede/Vor-/Nachname, Tabs konfigurierbar), Anfragen (Workflow
konfigurierbar, Listenansicht), Angebote (Positionen, MwSt. pro Position,
Rabatte, Positions-Bibliothek, Versionierung, Vorlagen), Termine (Kalender mit
Monats-/Wochen-/Tagesansicht inkl. Stunden-Zeitachse, Terminarten konfigurierbar,
Zuständigkeit pro Termin mit Personen-Filter, Arbeitszeiten/Urlaub/Feiertage),
Arbeit/Aufträge, Finanzen/Rechnungen (eigenständiges Erstellformular mit
Feld-Konfiguration, Mahnwesen, PDF, E-Mail-Versand), Aufgaben (eigenständiges
Modul, frei erstellbar, mit beliebigen Datensätzen verknüpfbar), Einblicke
(freier Diagramm-Baukasten: beliebiges Feld je Datentyp gruppierbar — Enum/Text/
Zahl mit Wertebereichen/Datum mit wählbarer Granularität/Verknüpfung — plus freie
Kennzahlen mit wählbarem Summen- und Zeitfenster-Feld, beides duplizierbar,
CSV-Export, druckfreundlicher Bericht), Kunden-Radar, Einstellungen (4 Bereiche:
Mein Konto / Firma / Anfragen & Vertrieb / Dokumente & Finanzen — Darstellung
(Farbmodus, Schriftgröße, App-Akzentfarbe) gebündelt unter Mein Konto →
"Systemeinstellungen"), Hilfebuch (schwebender Button unten rechts,
Volltextsuche), Suche (durchsucht alle Datensatztypen), Auth (2FA,
E-Mail-Verifizierung, Registrierung mit Stripe-Abo/Testphase), Plattform-Admin
(Firmen-Übersicht, Sperren/Löschen, Support-Zugriff, Billing-Status),
Abo-Abrechnung (gestaffelter Preis pro Mitarbeiter über Stripe, Billing-Portal).

## Offene Backlog-Punkte
Keine bekannt. Der vollständige App-Audit (76 Findings, nach Schweregrad
abgearbeitet) und die o.g. Wunschliste sind beide vollständig umgesetzt,
verifiziert und deployt. Neue Wünsche bitte als frische Anfrage stellen statt
hier nachzutragen — diese Datei wird nicht laufend gepflegt.

## Wie du am besten weiterarbeitest
- Lies dir bei Unsicherheit zu bestehenden Mustern die entsprechenden Dateien im
  Projekt an (z. B. `lib/field-config-catalog.ts`, `components/settings-section.tsx`)
  statt neue, abweichende Muster einzuführen.
- Bei Datenbank-Änderungen: `npm run prisma:migrate` mit sprechendem Namen, danach
  kurz erklären, was zu tun ist (der Nutzer führt die Befehle selbst aus).
- Bei größeren neuen Themen (siehe Backlog oben): kurz Rückfrage stellen, in welcher
  Reihenfolge/mit welchem Detailgrad der Nutzer es möchte — er priorisiert gerne
  selbst, wenn ihm Optionen vorgelegt werden.
