import { stripe } from "@/lib/stripe";

// Die Abo-Preise (siehe lib/subscription-pricing.ts) sind NETTO; die gesetzliche
// Umsatzsteuer wird in Stripe als exklusiver Steuersatz obendrauf berechnet --
// 10 EUR netto ergeben also 11,90 EUR brutto. Ein fester Steuersatz statt Stripe
// Tax, damit keine zusaetzliche Einrichtung im Stripe-Konto noetig ist.
export const VAT_PERCENT = 19;

let cachedRateId: string | null = null;

// Liefert die ID des 19-%-USt-Steuersatzes im Stripe-Konto und legt ihn beim
// ersten Aufruf selbst an (live wie im Testmodus, je nach verwendetem Schluessel)
// -- keine manuelle Anlage und keine zusaetzliche Umgebungsvariable noetig.
export async function getVatTaxRateId(): Promise<string> {
  if (cachedRateId) return cachedRateId;
  if (!stripe) throw new Error("Stripe ist nicht konfiguriert.");

  const existing = await stripe.taxRates.list({ active: true, inclusive: false, limit: 100 });
  const found = existing.data.find(
    (r) => r.percentage === VAT_PERCENT && r.country === "DE" && r.display_name === "USt"
  );
  if (found) {
    cachedRateId = found.id;
    return found.id;
  }

  const created = await stripe.taxRates.create({
    display_name: "USt",
    description: `Umsatzsteuer ${VAT_PERCENT} %`,
    percentage: VAT_PERCENT,
    inclusive: false,
    country: "DE",
    jurisdiction: "DE",
    tax_type: "vat",
  });
  cachedRateId = created.id;
  return created.id;
}
