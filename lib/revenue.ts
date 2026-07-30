import { prisma } from "@/lib/prisma";

export const REVENUE_SOURCE_CATALOG: { key: string; label: string }[] = [
  { key: "inquiry_won", label: "Gewonnene Anfragen (Betrag)" },
  { key: "appointment_done", label: "Abgeschlossene Termine (Betrag)" },
  { key: "quote_accepted", label: "Angenommene Angebote (Betrag)" },
  { key: "invoice_paid", label: "Bezahlte Rechnungen (Betrag)" },
];

type DateRange = { gte?: Date; lte?: Date };

// Summiert den Umsatz aus allen für die Firma aktivierten Quellen. Optionaler
// Zeitraum wird je Quelle auf das jeweils sinnvollste Datumsfeld angewendet
// (z.B. bei Terminen der Termintag, bei Rechnungen das Bezahldatum). Optional
// auf einen einzelnen Kunden eingrenzbar (für die Kundenprofil-Kachel).
export async function computeRevenue(
  companyId: string,
  range?: DateRange,
  customerId?: string
): Promise<number> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { revenueSources: true },
  });
  const sources = company?.revenueSources?.length ? company.revenueSources : ["invoice_paid"];

  let total = 0;

  if (sources.includes("inquiry_won")) {
    const agg = await prisma.inquiry.aggregate({
      where: {
        companyId,
        status: "WON",
        ...(customerId ? { customerId } : {}),
        ...(range ? { updatedAt: range } : {}),
      },
      _sum: { amount: true },
    });
    total += Number(agg._sum.amount ?? 0);
  }

  if (sources.includes("appointment_done")) {
    const agg = await prisma.appointment.aggregate({
      where: {
        companyId,
        status: "DONE",
        ...(customerId ? { customerId } : {}),
        ...(range ? { scheduledAt: range } : {}),
      },
      _sum: { amount: true },
    });
    total += Number(agg._sum.amount ?? 0);
  }

  if (sources.includes("quote_accepted")) {
    const agg = await prisma.quote.aggregate({
      where: {
        companyId,
        status: "ACCEPTED",
        ...(customerId ? { customerId } : {}),
        ...(range ? { updatedAt: range } : {}),
      },
      _sum: { totalGross: true },
    });
    total += Number(agg._sum.totalGross ?? 0);
  }

  if (sources.includes("invoice_paid")) {
    const agg = await prisma.invoice.aggregate({
      where: {
        companyId,
        status: "PAID",
        ...(customerId ? { customerId } : {}),
        ...(range ? { paidAt: range } : {}),
      },
      _sum: { totalGross: true },
    });
    total += Number(agg._sum.totalGross ?? 0);
  }

  return total;
}
