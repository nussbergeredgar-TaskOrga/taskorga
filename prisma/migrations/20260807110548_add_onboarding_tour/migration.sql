-- User: Pflicht-Einfuehrungstour-Fortschritt (siehe lib/actions/onboarding.ts).
-- DEFAULT now() bei onboardingCompletedAt sorgt dafuer, dass alle bestehenden
-- Nutzer beim Anlegen der Spalte automatisch als "abgeschlossen" gelten -- sie
-- sehen die Tour nie. Im Prisma-Schema ist das Feld bewusst ohne @default(...)
-- deklariert, damit neue Nutzer (signup.ts/team.ts) explizit NULL bekommen.
ALTER TABLE "User" ADD COLUMN "onboardingStep" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3) DEFAULT now();
