import Stripe from "stripe";

// Ohne STRIPE_SECRET_KEY (z.B. bevor Edgar ein Stripe-Konto eingerichtet hat)
// bleibt der Client bewusst "null" -- Aufrufstellen pruefen das explizit und
// fallen dann auf einen kostenlosen Zugriff zurueck (fail-open), statt dass
// z.B. die Registrierung deswegen fehlschlaegt.
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-07-29.dahlia" })
  : null;
