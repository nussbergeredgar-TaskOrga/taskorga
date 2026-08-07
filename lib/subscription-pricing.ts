// Gestaffelter, kumulativer Preis pro Mitarbeiter (entspricht Stripes
// "graduated pricing" -- jede Stufe wird einzeln abgerechnet und aufsummiert,
// nicht die ganze Mitarbeiterzahl zum Preis der zuletzt erreichten Stufe).
// Rein fuer die Anzeige gedacht -- die tatsaechliche Abrechnung erfolgt immer
// ueber Stripe selbst (siehe scripts/setup-stripe-price.js fuer die dort
// hinterlegte, identische Staffel).
const TIERS: { upTo: number; unitPrice: number }[] = [
  { upTo: 4, unitPrice: 19 },
  { upTo: 10, unitPrice: 14 },
  { upTo: Infinity, unitPrice: 9 },
];

export function computeMonthlyPrice(seatCount: number): number {
  if (seatCount <= 0) return 0;
  let remaining = seatCount;
  let previousUpTo = 0;
  let total = 0;

  for (const tier of TIERS) {
    if (remaining <= 0) break;
    const tierSize = tier.upTo - previousUpTo;
    const seatsInTier = Math.min(remaining, tierSize);
    total += seatsInTier * tier.unitPrice;
    remaining -= seatsInTier;
    previousUpTo = tier.upTo;
  }

  return total;
}

export function mapStripeStatus(
  status: string
): "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "INCOMPLETE" {
  switch (status) {
    case "trialing":
      return "TRIALING";
    case "active":
      return "ACTIVE";
    case "past_due":
    case "unpaid":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    default:
      return "INCOMPLETE";
  }
}
