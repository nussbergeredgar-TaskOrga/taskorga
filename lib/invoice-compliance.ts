// Pflichtangaben einer Rechnung nach § 14 UStG, soweit sie aus den Stammdaten
// stammen: Name und Anschrift des leistenden Unternehmers und des
// Leistungsempfaengers sowie Steuernummer oder USt-IdNr. des Ausstellers.
// Bei Kleinbetragsrechnungen (bis 250 EUR brutto) entfaellt die Anschrift des
// Empfaengers (§ 33 UStDV) -- TaskOrga verlangt sie bewusst trotzdem immer
// (Entscheidung von Edgar, 2026-10-14): die Anschrift kommt aus dem Kundenstamm.

export type InvoiceGap = { label: string; href: string };

type CompanyData = {
  name: string;
  address: string | null;
  zip: string | null;
  city: string | null;
  taxNumber: string | null;
  vatId: string | null;
};

type CustomerData = {
  id: string;
  name: string;
  address: string | null;
  zip: string | null;
  city: string | null;
};

const blank = (v: string | null | undefined) => !v || !v.trim();

export function missingInvoiceDetails(company: CompanyData, customer: CustomerData, totalGross: number): InvoiceGap[] {
  const gaps: InvoiceGap[] = [];
  const companyHref = "/einstellungen/firma";

  if (blank(company.address) || blank(company.zip) || blank(company.city)) {
    gaps.push({ label: "Deine Firmenanschrift (Straße, PLZ, Ort)", href: companyHref });
  }
  if (blank(company.taxNumber) && blank(company.vatId)) {
    gaps.push({ label: "Deine Steuernummer oder USt-IdNr.", href: companyHref });
  }
  if (blank(customer.address) || blank(customer.zip) || blank(customer.city)) {
    gaps.push({
      label: `Anschrift des Kunden „${customer.name}“`,
      href: `/kunden/${customer.id}/bearbeiten`,
    });
  }

  return gaps;
}

export function describeInvoiceGaps(gaps: InvoiceGap[]): string {
  return `Die Rechnung ist noch nicht vollständig. Es fehlen: ${gaps.map((g) => g.label).join("; ")}.`;
}
