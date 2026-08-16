"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateCrossSellSuggestion } from "@/lib/ai";
import { getCurrentCompany } from "@/lib/session";

export async function generateCustomerInsight(
  customerId: string
): Promise<{ error?: string; success?: boolean }> {
  const company = await getCurrentCompany();
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, companyId: company.id },
    include: {
      projects: { select: { title: true } },
      quotes: { include: { items: { select: { description: true } } } },
      invoices: { select: { totalGross: true, status: true } },
      appointments: { select: { scheduledAt: true, type: true }, orderBy: { scheduledAt: "desc" }, take: 5 },
      activities: { orderBy: { createdAt: "desc" }, take: 8, select: { message: true, createdAt: true } },
    },
  });

  if (!customer) return { error: "Kunde nicht gefunden." };

  const itemDescriptions = customer.quotes.flatMap((q) => q.items.map((i) => i.description));
  const totalRevenue = customer.invoices
    .filter((i) => i.status === "PAID")
    .reduce((sum, i) => sum + Number(i.totalGross), 0);
  const lastContact = customer.activities[0]?.createdAt;

  const context = `Du bist ein erfahrener Vertriebsassistent für ein kleines Unternehmen bzw. eine/n Selbstständige/n (z. B. Handwerk, Beratung, Gesundheit/Wellness, kreative Dienstleistungen oder andere Branchen).

Analysiere den folgenden Kunden und gib 2 bis 4 konkrete, kurze Cross-Selling- oder Nachfass-Vorschläge auf Deutsch. Beziehe dich dabei erkennbar auf das, was der Kunde bereits gekauft/beauftragt hat, und schlage sinnvolle Anschlussleistungen, Folgetermine oder wiederkehrende Aufträge vor, die zu diesem Kunden passen. Falls der Kunde lange keinen Kontakt hatte, erwähne das als eigenen Punkt.

Antworte NUR mit einer kurzen Aufzählung (Bindestriche), keine Einleitung, keine Zusammenfassung danach, maximal 4 Punkte, jeder Punkt maximal 2 Sätze.

Kunde: ${customer.name} (${customer.type === "BUSINESS" ? "Geschäftskunde" : "Privatkunde"})
Kunde seit: ${customer.customerSince.toLocaleDateString("de-DE")}
Anzahl Aufträge: ${customer.projects.length}
Bisherige Angebots-/Auftragspositionen: ${itemDescriptions.length > 0 ? itemDescriptions.join("; ") : "keine erfasst"}
Gesamtumsatz (bezahlt): ${totalRevenue.toLocaleString("de-DE")} €
Letzter Kontakt: ${lastContact ? lastContact.toLocaleDateString("de-DE") : "unbekannt"}
Notizen: ${customer.notes || "keine"}`;

  try {
    const suggestion = await generateCrossSellSuggestion(context);

    await prisma.customerInsight.upsert({
      where: { customerId },
      create: { customerId, content: suggestion },
      update: { content: suggestion, generatedAt: new Date() },
    });

    revalidatePath(`/kunden/${customerId}`);
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "KI-Anfrage fehlgeschlagen." };
  }
}
