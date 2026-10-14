// Firmendaten, die TaskOrga fuer die eigene Rechnungsstellung an den Kunden
// braucht (Anschrift des Leistungsempfaengers nach § 14 UStG) sowie die
// Rufnummer fuer Rueckfragen. Ohne sie wird kein kostenpflichtiges Abo
// abgeschlossen und keine Zahlungsmethode hinterlegt.
export type BillingProfileFields = {
  address: string | null;
  zip: string | null;
  city: string | null;
  phone: string | null;
};

export const BILLING_PROFILE_LABELS: Record<keyof BillingProfileFields, string> = {
  address: "Straße & Hausnummer",
  zip: "PLZ",
  city: "Ort",
  phone: "Telefonnummer",
};

export function missingBillingProfile(company: BillingProfileFields): (keyof BillingProfileFields)[] {
  return (Object.keys(BILLING_PROFILE_LABELS) as (keyof BillingProfileFields)[]).filter(
    (key) => !company[key] || !company[key]!.trim()
  );
}

const PHONE_RE = /^\+?[\d\s()\/.-]{6,}$/;

// Gemeinsame Rufnummern-Pruefung fuer Registrierung, Firmenprofil und Sperrseite
export function isPlausiblePhone(value: string): boolean {
  const trimmed = value.trim();
  if (!PHONE_RE.test(trimmed)) return false;
  return trimmed.replace(/\D/g, "").length >= 6;
}
