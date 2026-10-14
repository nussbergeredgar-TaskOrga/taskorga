"use server";

import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { requireAdmin } from "@/lib/session";
import { isBillingBlocked } from "@/lib/billing-lock";
import { confirmPassword } from "@/lib/password-confirm";
import { deleteCompanyData } from "@/lib/company-deletion";

// Aktionen der Sperrseite (/abrechnung-erforderlich). Jede folgenreiche
// Entscheidung -- Abo abschliessen, Zahlungsmethode aendern, Konto loeschen --
// verlangt erneut das Passwort des angemeldeten Admins. Der Daten-Export hat
// dafuer eine eigene Route (app/api/abrechnung/export/route.ts).

async function lockedAdminContext(password: string) {
  const admin = await requireAdmin();
  const company = await prisma.company.findUnique({ where: { id: admin.companyId } });
  if (!company) return { error: "Firma nicht gefunden." } as const;
  if (!isBillingBlocked(company)) return { error: "Der Zugang ist nicht gesperrt." } as const;

  const confirmed = await confirmPassword(admin.id, password);
  if (!confirmed.ok) return { error: confirmed.error } as const;

  return { admin, company } as const;
}

// Neues, kostenpflichtiges Abo ueber Stripe Checkout (gehostete Zahlungsseite).
// Menge = aktuelle Nutzerzahl; die Staffel rechnet Stripe selbst.
export async function startSubscriptionCheckout(password: string): Promise<{ url?: string; error?: string }> {
  const ctx = await lockedAdminContext(password);
  if ("error" in ctx) return { error: ctx.error };
  const { admin, company } = ctx;

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!stripe || !priceId) return { error: "Die Abrechnung ist derzeit nicht verfügbar." };

  // Besteht noch ein offenes Abo (z.B. fehlgeschlagene Zahlung), darf kein
  // zweites angelegt werden -- dort ist die Zahlungsmethode zu aktualisieren.
  if (company.subscriptionStatus !== "CANCELED") {
    return { error: "Für dieses Konto besteht noch ein Abo. Bitte die Zahlungsmethode aktualisieren." };
  }

  try {
    let customerId = company.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: company.name,
        email: admin.email,
        metadata: { companyId: company.id },
      });
      customerId = customer.id;
      await prisma.company.update({ where: { id: company.id }, data: { stripeCustomerId: customerId } });
    }

    const seatCount = Math.max(1, await prisma.user.count({ where: { companyId: company.id } }));
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: company.id,
      line_items: [{ price: priceId, quantity: seatCount }],
      locale: "de",
      // TaskOrga rechnet als Verkaeufer selbst ab (Preise netto zzgl. USt). Stripes
      // "Managed Payments" (Stripe als Haendler) ist am Konto standardmaessig aktiv
      // und verlangt Produkt-Steuercodes -- hier bewusst deaktiviert.
      managed_payments: { enabled: false },
      customer_update: { name: "auto", address: "auto" },
      billing_address_collection: "required",
      success_url: `${baseUrl}/abrechnung-erforderlich?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/abrechnung-erforderlich?checkout=cancel`,
      subscription_data: { metadata: { companyId: company.id } },
    });

    if (!session.url) return { error: "Die Zahlungsseite konnte nicht geöffnet werden." };
    return { url: session.url };
  } catch (err) {
    console.error("Stripe-Checkout konnte nicht angelegt werden:", err);
    return { error: "Die Zahlungsseite konnte nicht geöffnet werden. Bitte später erneut versuchen." };
  }
}

// Fuer Konten mit noch bestehendem Abo (fehlgeschlagene Zahlung): Zahlungsportal
// zum Aktualisieren der Zahlungsmethode.
export async function openPaymentPortal(password: string): Promise<{ url?: string; error?: string }> {
  const ctx = await lockedAdminContext(password);
  if ("error" in ctx) return { error: ctx.error };
  const { company } = ctx;

  if (!stripe || !company.stripeCustomerId) return { error: "Für diese Firma ist kein Stripe-Konto hinterlegt." };

  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const portal = await stripe.billingPortal.sessions.create({
      customer: company.stripeCustomerId,
      return_url: `${baseUrl}/abrechnung-erforderlich`,
    });
    return { url: portal.url };
  } catch (err) {
    console.error("Stripe-Portal konnte nicht geoeffnet werden:", err);
    return { error: "Das Zahlungsportal konnte nicht geöffnet werden." };
  }
}

// "Daten nicht exportieren und Konto loeschen": entfernt alles unwiderruflich.
// Zusaetzlich zur Passwort-Bestaetigung muss die Auswahl ausdruecklich
// bestaetigt worden sein (zweite Stufe in der Oberflaeche).
export async function deleteLockedAccount(
  password: string,
  acknowledged: boolean
): Promise<{ success?: boolean; error?: string }> {
  if (!acknowledged) return { error: "Bitte die Löschung ausdrücklich bestätigen." };

  const ctx = await lockedAdminContext(password);
  if ("error" in ctx) return { error: ctx.error };

  try {
    await deleteCompanyData(ctx.company.id);
  } catch (err) {
    console.error("Loeschung bei gesperrtem Konto fehlgeschlagen:", err);
    return { error: "Löschen fehlgeschlagen. Es wurde nichts geändert — bitte erneut versuchen." };
  }

  return { success: true };
}
