import { prisma } from "@/lib/prisma";
import type { SystemEmailSettings } from "@prisma/client";

// Es gibt bewusst nur eine einzige Zeile (Singleton) -- die vier System-Mails
// (Registrierung, Passwort, Team-/Plattform-Einladung) sind Angelegenheit von
// TaskOrga selbst, nicht pro Firma. Existiert die Zeile noch nicht (z.B. vor
// der ersten Bearbeitung im Adminbereich), wird sie mit den Standardwerten
// aus dem Prisma-Schema automatisch angelegt.
export async function getSystemEmailSettings(): Promise<SystemEmailSettings> {
  const existing = await prisma.systemEmailSettings.findFirst();
  if (existing) return existing;
  return prisma.systemEmailSettings.create({ data: {} });
}

// Ersetzt {{firma}}/{{tage}} u.ae. im Text durch echte Werte. Unbekannte
// Platzhalter bleiben unveraendert stehen (faellt auf, statt still zu verschwinden).
export function resolveEmailPlaceholders(text: string, context: Record<string, string>): string {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key) => context[key] ?? match);
}

// Wandelt mehrzeiligen Text (z.B. aus einem <textarea>) in einzelne <p>-Absaetze,
// wie es die uebrigen Bausteine der Mail-Vorlage erwarten.
export function textToParagraphs(text: string): string {
  return text
    .split(/\n{2,}|\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p style="margin:0 0 14px;">${line}</p>`)
    .join("");
}
