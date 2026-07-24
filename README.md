# TaskOrga

Weniger Büro. Mehr Business.

## Setup (lokal)

1. Abhängigkeiten installieren:
   ```
   npm install
   ```

2. `.env.example` zu `.env` kopieren und `DATABASE_URL` auf eine laufende PostgreSQL-Datenbank setzen:
   ```
   cp .env.example .env
   ```

3. Datenbankschema anwenden:
   ```
   npm run prisma:migrate
   ```

3b. Demo-Firma und Beispielkunden anlegen (wichtig für den ersten Testlauf):
   ```
   npm run prisma:seed
   ```

4. Entwicklungsserver starten:
   ```
   npm run dev
   ```

5. Im Browser öffnen: http://localhost:3000

## Projektstruktur

- `app/(dashboard)/` — eingeloggter Bereich mit Sidebar + Topbar (Workspaces: Heute, Kunden, Anfragen, Arbeit, Finanzen, Einblicke, Einstellungen)
- `components/` — wiederverwendbare UI-Bausteine
- `lib/prisma.ts` — Datenbank-Client
- `prisma/schema.prisma` — vollständiges Datenmodell

## Status

Der komplette Kernworkflow ist jetzt end-to-end klickbar:

Kunde anlegen → Anfrage anlegen → Anfrage durch die Pipeline bis "Telefonat erfolgt"
→ Angebot erstellen (mit Positionen) → Angebot annehmen (erzeugt automatisch einen
Auftrag) → Auftrag starten/abschließen, Aufgaben abhaken → Rechnung aus Auftrag
erstellen → Rechnung versenden → als bezahlt markieren.

Workspaces:
- **Heute** – echtes Dashboard: offene Aufgaben, offene Rechnungen, Monatsumsatz,
  neue Anfragen – plus Aufgabenliste und Aktivitäten-Feed, alles aus der Datenbank
- **Kunden** – Liste, Anlegen, Detailseite mit 10 Tabs inkl. Timeline (Notizen),
  Termine (anlegen + Status) und Dokumente (echter Datei-Upload via Vercel Blob)
- **Anfragen** – Kanban-Board mit Status-Pipeline
- **Angebote** – Anlegen mit dynamischen Positionen/Summen, Annehmen → Auftrag
- **Arbeit** – Aufträge mit Aufgaben-Checkliste, Rechnung erzeugen
- **Finanzen** – Rechnungen mit Versenden/Bezahlt-Status, einfache KPIs

Provisorisch: Login ist jetzt eingebaut (siehe unten), aber es gibt noch keine
Selbstregistrierung/Passwort-Reset – neue Nutzer müssten aktuell direkt in der
Datenbank angelegt werden.

## Login

Demo-Zugang nach `npm run prisma:seed`:
- E-Mail: `demo@taskorga.app`
- Passwort: `demo1234`

Für den Login muss in der `.env` zusätzlich `NEXTAUTH_SECRET` gesetzt sein
(siehe `.env.example`). Bei Vercel als Environment Variable eintragen, plus
`NEXTAUTH_URL` auf die echte Deployment-URL setzen (z.B. `https://taskorga.vercel.app`).

## Datei-Upload (Dokumente-Tab)

Echter Upload läuft über Vercel Blob (max. 4,5 MB pro Datei in dieser Version).

1. Im Vercel-Dashboard: Projekt öffnen → „Storage" → „Create Database" → „Blob" auswählen
2. Nach dem Erstellen zeigt Vercel einen Tab „.env.local" mit dem fertigen
   `BLOB_READ_WRITE_TOKEN` – diesen Wert in deine `.env` (lokal) und in die
   Vercel Environment Variables (fürs Deployment) eintragen
3. Ohne diesen Token schlägt der Upload mit einer Fehlermeldung fehl – alle
   anderen Funktionen der App sind davon nicht betroffen

## PWA (Installation aufs Homescreen)

Die App hat ein Manifest, App-Icons und einen Service Worker. Nach dem Deployment
kann sie auf dem iPhone über Safari → Teilen → „Zum Home-Bildschirm" installiert
werden und startet dann wie eine native App (ohne Browserleiste).
"# taskorga" 
