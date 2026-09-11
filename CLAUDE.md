# TaskOrga

Deutsche B2B-SaaS für Selbstständige/kleine Unternehmen. Next.js 14 (App Router), TypeScript,
Prisma/Postgres (Neon), NextAuth, Vercel, Resend, `web-push`, PWA. Alleiniger Entwickler/Betreiber:
Edgar Nussberger.

## Sprache & Kommunikation

Immer auf Deutsch antworten. Kurz und direkt, keine unnötigen Zusammenfassungen am Ende, wenn der
Diff/die Ausgabe schon für sich spricht.

## Stack & Struktur

- `app/` — App Router. `(dashboard)` Route-Gruppe für alles hinter dem Login; alles außerhalb
  (Marketing-nahe Seiten wie `/login`, `/registrieren`, `/agb`, `/plattform-admin`) ist bewusst
  nicht in der Gruppe.
- `lib/actions/` — Server Actions (`"use server"`), eine Datei pro Domäne (z. B. `projects.ts`,
  `platform-admin.ts`).
- `components/` — Client-Komponenten, meist 1:1 zu einer Server-Action-Datei.
- `prisma/schema.prisma` + `prisma/migrations/` — siehe unten.
- Sibling-Repo `taskorga-website` (Marketing-Seite) liegt unter
  `C:\Users\Edgar Nussberger\Desktop\taskorga-website`, separates Repo, aber im selben Zug
  mitzudenken wenn es um AGB/Datenschutz-Links, Impressum o.ä. geht.

## Datenbank-Migrationen

Migrationen werden **manuell** geschrieben, nicht mit `prisma migrate dev` generiert, unter
`prisma/migrations/<timestamp>_<name>/migration.sql`. Anwenden mit:

```bash
npx prisma migrate deploy
npx prisma generate
```

Bei neuen Feldern mit NOT-NULL-artiger Semantik (z. B. ein neues Pflichtfeld mit Default) immer ein
Backfill-UPDATE mit in die Migration aufnehmen, damit bestehende Zeilen nicht blockiert werden.

Die Datenbank (Neon, per `DATABASE_URL`) wird zwischen lokaler Entwicklung und Produktion geteilt —
siehe **Sandbox-Umgebungen** unten, bevor gegen echte/viele Daten getestet wird.

## Sandbox-Umgebungen

Zwei separate Umgebungen für Entwicklung/Support, beide über Neon-DB-Branches + Vercel
Branch-gebundene Env-Vars realisiert (kein echtes Custom-Environment-Tier auf diesem Vercel-Plan):

- **`staging`** (Git-Branch + Neon-Branch) — zum Bauen/Testen neuer Features gegen realistische
  gespiegelte Daten, sicher zum Kaputtmachen.
- **`support`** (Git-Branch, bleibt auf `main`-Stand + eigener Neon-Branch) — zum Nachstellen von
  Kundenproblemen, isoliert von echten Produktionsdaten und von der `staging`-Entwicklung.

`NEON_API_KEY` und `VERCEL_API_TOKEN` liegen in `.env`. Details siehe Memory
`project_sandbox_environments`.

## Verifizierungs-Workflow (immer, ohne Rückfrage, bevor eine Aufgabe als erledigt gilt)

1. `npx tsc --noEmit`
2. `npm run build`
3. Live-Test im Browser (Dev-Server über `.claude/launch.json`, Konfiguration `taskorga-dev`,
   Port 3000 — vor dem Start prüfen, ob der Port schon von einem alten Prozess belegt ist).
   Bei zeitabhängigen Signalen (z. B. Kunden-Radar, Eskalationen) Testdaten direkt per Prisma-Skript
   mit passendem `createdAt`/`updatedAt` anlegen, nicht nur über die UI.
4. Testdaten wieder löschen (immer mit `_tmp`-Präfix anlegen, damit sie eindeutig erkennbar sind;
   FK-Reihenfolge beim Löschen beachten: Dashboard/PushSubscription → EmailVerificationToken →
   TaskEscalationLevel/AppointmentTypeOption/ReminderLevel/WorkflowStep → Role → User → Company).
5. Committen (neuer Commit, kein `--amend`, außer explizit gewünscht) und pushen — ohne separat zu
   fragen, das ist der erwartete Standardablauf.

## Git

- Neue Commits statt `--amend`, kein `--no-verify`/`--no-gpg-sign` ohne explizite Anfrage.
- Commit-Nachrichten auf Deutsch, kurz, mit Fokus auf das *Warum*.
