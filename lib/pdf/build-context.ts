import type { PlaceholderContext } from "@/lib/document-placeholders";

type CompanyLike = {
  name: string;
  address?: string | null;
  zip?: string | null;
  city?: string | null;
  taxNumber?: string | null;
  vatId?: string | null;
  bankName?: string | null;
  iban?: string | null;
  bic?: string | null;
};

type CustomerLike = {
  name: string;
  address?: string | null;
  zip?: string | null;
  city?: string | null;
  email?: string | null;
  phone?: string | null;
};

export function buildPlaceholderContext(params: {
  company: CompanyLike;
  customer: CustomerLike;
  number: string;
  title: string;
  createdAt: string;
  validUntilOrDue?: string;
  totalNet: number;
  totalGross: number;
}): PlaceholderContext {
  const { company, customer, number, title, createdAt, validUntilOrDue, totalNet, totalGross } = params;

  return {
    "kunde.name": customer.name,
    "kunde.adresse": customer.address ?? "",
    "kunde.plz_ort": [customer.zip, customer.city].filter(Boolean).join(" "),
    "kunde.email": customer.email ?? "",
    "kunde.telefon": customer.phone ?? "",

    "firma.name": company.name,
    "firma.adresse": company.address ?? "",
    "firma.plz_ort": [company.zip, company.city].filter(Boolean).join(" "),
    "firma.steuernummer": company.taxNumber ?? "",
    "firma.ust_id": company.vatId ?? "",
    "firma.bank": company.bankName ?? "",
    "firma.iban": company.iban ?? "",
    "firma.bic": company.bic ?? "",

    "dokument.nummer": number,
    "dokument.titel": title,
    "dokument.datum": createdAt,
    "dokument.frist": validUntilOrDue ?? "",
    "dokument.netto": `${totalNet.toLocaleString("de-DE")} €`,
    "dokument.mwst": `${(totalGross - totalNet).toLocaleString("de-DE")} €`,
    "dokument.brutto": `${totalGross.toLocaleString("de-DE")} €`,
  };
}
