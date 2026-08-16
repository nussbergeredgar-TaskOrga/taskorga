import { prisma } from "@/lib/prisma";
import { generateDocumentNumber } from "@/lib/numbering";

// Kunden (Customer) und deren Ansprechpartner (Contact) teilen sich einen
// Nummernkreis ("Kundennummer") -- ein count()-basierter Ansatz wie bei
// Angebots-/Rechnungsnummern (lib/numbering.ts) waere hier nicht race-sicher,
// da zwei verschiedene Tabellen denselben Zaehler verwenden. Der atomare
// increment auf Company.customerNumberSeq ist dagegen race-sicher.
export async function nextCustomerNumber(companyId: string): Promise<string> {
  const company = await prisma.company.update({
    where: { id: companyId },
    data: { customerNumberSeq: { increment: 1 } },
    select: { customerNumberSeq: true, customerNumberFormat: true },
  });
  return generateDocumentNumber(company.customerNumberFormat, company.customerNumberSeq);
}
