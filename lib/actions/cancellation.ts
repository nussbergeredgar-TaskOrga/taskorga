"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { requireAdmin } from "@/lib/session";
import { confirmPassword } from "@/lib/password-confirm";

// Nimmt eine Kuendigung zum Periodenende zurueck: das Abo laeuft einfach weiter.
// Wie jede Abo-Entscheidung nur nach erneuter Passwort-Bestaetigung.
export async function revokeCancellation(password: string): Promise<{ success?: boolean; error?: string }> {
  const admin = await requireAdmin();

  const confirmed = await confirmPassword(admin.id, password);
  if (!confirmed.ok) return { error: confirmed.error };

  const company = await prisma.company.findUnique({ where: { id: admin.companyId } });
  if (!company) return { error: "Firma nicht gefunden." };
  if (!stripe || !company.stripeSubscriptionId) return { error: "Für dieses Konto besteht kein Abo." };
  if (company.subscriptionStatus !== "ACTIVE" || !company.cancelAt) {
    return { error: "Es liegt keine Kündigung vor, die zurückgenommen werden könnte." };
  }

  try {
    // Stripe erlaubt nur EINEN der beiden Parameter je Aufruf: "zum Periodenende"
    // gekuendigt (cancel_at_period_end) ODER mit festem Datum (cancel_at, z.B.
    // aus dem Stripe-Dashboard) -- also den tatsaechlichen Zustand zuruecksetzen.
    const current = await stripe.subscriptions.retrieve(company.stripeSubscriptionId);
    if (current.cancel_at_period_end) {
      await stripe.subscriptions.update(company.stripeSubscriptionId, { cancel_at_period_end: false });
    } else if (current.cancel_at) {
      await stripe.subscriptions.update(company.stripeSubscriptionId, { cancel_at: "" });
    }
  } catch (err) {
    console.error("Kuendigung konnte nicht zurueckgenommen werden:", err);
    return { error: "Die Kündigung konnte nicht zurückgenommen werden. Bitte später erneut versuchen." };
  }

  await prisma.company.update({
    where: { id: company.id },
    data: { cancelAt: null, cancellationEmailSentAt: null },
  });

  revalidatePath("/", "layout");
  return { success: true };
}
