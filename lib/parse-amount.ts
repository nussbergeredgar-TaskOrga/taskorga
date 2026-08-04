export type ParsedAmount = { ok: true; value: number | null } | { ok: false };

// Leeres Feld ist gueltig (kein Betrag angegeben). Ein ausgefuelltes Feld,
// das sich nicht als Zahl interpretieren laesst (z.B. Tippfehler wie "15o0"),
// wurde bisher still zu null -- der Nutzer dachte, der Betrag sei gespeichert,
// tatsaechlich ging er unbemerkt verloren. ok:false zwingt die Aufrufer dazu,
// das als echten Validierungsfehler zu behandeln.
export function parseAmount(raw?: string | null): ParsedAmount {
  if (!raw || !raw.trim()) return { ok: true, value: null };
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? { ok: true, value: n } : { ok: false };
}
