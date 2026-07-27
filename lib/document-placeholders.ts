export const PLACEHOLDER_GROUPS: { label: string; tokens: { token: string; label: string }[] }[] = [
  {
    label: "Kunde",
    tokens: [
      { token: "kunde.name", label: "Name" },
      { token: "kunde.adresse", label: "Straße & Nr." },
      { token: "kunde.plz_ort", label: "PLZ & Ort" },
      { token: "kunde.email", label: "E-Mail" },
      { token: "kunde.telefon", label: "Telefon" },
    ],
  },
  {
    label: "Firma",
    tokens: [
      { token: "firma.name", label: "Firmenname" },
      { token: "firma.adresse", label: "Straße & Nr." },
      { token: "firma.plz_ort", label: "PLZ & Ort" },
      { token: "firma.steuernummer", label: "Steuernummer" },
      { token: "firma.ust_id", label: "USt-IdNr." },
      { token: "firma.bank", label: "Bank" },
      { token: "firma.iban", label: "IBAN" },
      { token: "firma.bic", label: "BIC" },
    ],
  },
  {
    label: "Dokument",
    tokens: [
      { token: "dokument.nummer", label: "Nummer" },
      { token: "dokument.titel", label: "Titel" },
      { token: "dokument.datum", label: "Datum" },
      { token: "dokument.frist", label: "Gültig bis / Fällig am" },
      { token: "dokument.netto", label: "Netto-Betrag" },
      { token: "dokument.mwst", label: "MwSt.-Betrag" },
      { token: "dokument.brutto", label: "Gesamtbetrag" },
    ],
  },
];

export type PlaceholderContext = Record<string, string>;

// Ersetzt {{platzhalter.name}} im Text durch echte Werte. Unbekannte
// Platzhalter bleiben unverändert stehen (fällt auf, statt still zu verschwinden).
export function resolvePlaceholders(text: string, context: PlaceholderContext): string {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key) => context[key] ?? match);
}
