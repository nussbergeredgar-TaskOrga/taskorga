// Erzeugt eine E-Rechnung im Format XRechnung 3.0 (UN/CEFACT CII, EN 16931) aus
// den Rechnungsdaten. Reine Funktion ohne Datenbankzugriff: sammelt zuerst alle
// fehlenden Pflichtangaben ("problems") und liefert nur dann XML.
//
// Bewusste Annahmen (siehe Kommentare unten): Leistungsdatum = Rechnungsdatum,
// ein Zahlungsziel als Freitext plus Faelligkeitsdatum, Rabatt als Nachlass auf
// Dokumentebene, anteilig auf die Steuersaetze verteilt (so wie auch die
// PDF-Berechnung den Rabatt proportional auf alle Positionen anwendet).

export type XRechnungInput = {
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date | null;
  currency?: string;
  note?: string | null;
  // Kleinunternehmer (§ 19 UStG): keine Umsatzsteuer, Steuerkategorie "E"
  kleinunternehmer: boolean;
  discountValue?: number | null;
  discountType?: "AMOUNT" | "PERCENT" | string | null;
  seller: {
    name: string;
    address: string | null;
    zip: string | null;
    city: string | null;
    country: string | null;
    taxNumber: string | null;
    vatId: string | null;
    email: string | null;
    phone: string | null;
    contactName: string | null;
    iban: string | null;
  };
  buyer: {
    name: string;
    address: string | null;
    zip: string | null;
    city: string | null;
    country: string | null;
    email: string | null;
    vatId: string | null;
    // Leitweg-ID bzw. Referenz des Kaeufers (BT-10)
    reference: string | null;
    customerNumber: string | null;
  };
  items: { description: string; quantity: number; unit: string; unitPrice: number; taxRate: number }[];
};

export type XRechnungResult = { xml: string | null; problems: string[] };

const GUIDELINE = "urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0";

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const amount = (n: number) => r2(n).toFixed(2);
const qty = (n: number) => String(Math.round(n * 10000) / 10000);
const price = (n: number) => String(Math.round(n * 10000) / 10000);

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

function date102(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function countryCode(country: string | null): string {
  const c = (country ?? "").trim();
  if (!c || /^(de|deutschland|germany)$/i.test(c)) return "DE";
  if (/^[A-Za-z]{2}$/.test(c)) return c.toUpperCase();
  return "DE";
}

// Einheiten in UN/ECE-Recommendation-20-Codes
function unitCode(unit: string): string {
  const u = unit.trim().toLowerCase().replace(/\./g, "");
  const map: Record<string, string> = {
    stk: "C62", stück: "C62", stueck: "C62", st: "C62", x: "C62", pauschal: "C62", psch: "C62", pauschale: "C62",
    std: "HUR", h: "HUR", stunde: "HUR", stunden: "HUR",
    tag: "DAY", tage: "DAY", d: "DAY",
    monat: "MON", monate: "MON", mon: "MON",
    woche: "WEE", wochen: "WEE",
    m: "MTR", meter: "MTR", lfm: "MTR",
    "m²": "MTK", qm: "MTK", m2: "MTK",
    "m³": "MTQ", cbm: "MTQ", m3: "MTQ",
    kg: "KGM", t: "TNE", l: "LTR", liter: "LTR",
    km: "KMT", min: "MIN",
  };
  return map[u] ?? "C62";
}

type TaxGroup = { rate: number; net: number; allowance: number; basis: number; tax: number };

export function buildXRechnung(input: XRechnungInput): XRechnungResult {
  const problems: string[] = [];
  const s = input.seller;
  const b = input.buyer;
  const blank = (v: string | null | undefined) => !v || !v.trim();

  if (blank(s.address) || blank(s.zip) || blank(s.city)) problems.push("Firmenanschrift (Straße, PLZ, Ort)");
  if (blank(s.taxNumber) && blank(s.vatId)) problems.push("Steuernummer oder USt-IdNr. der Firma");
  if (blank(s.email)) problems.push("Kontakt-E-Mail der Firma (Firmenprofil)");
  if (blank(s.phone)) problems.push("Telefonnummer der Firma (Firmenprofil)");
  if (blank(s.iban)) problems.push("IBAN der Firma (Firmenprofil)");
  if (blank(b.address) || blank(b.zip) || blank(b.city)) problems.push(`Anschrift des Kunden „${b.name}“`);
  if (blank(b.email)) problems.push(`E-Mail-Adresse des Kunden „${b.name}“`);
  if (input.items.length === 0) problems.push("mindestens eine Position");
  if (problems.length > 0) return { xml: null, problems };

  const currency = input.currency || "EUR";
  const kleinunternehmer = input.kleinunternehmer;
  const category = kleinunternehmer ? "E" : "S";

  // Positionen
  const lines = input.items.map((it, i) => {
    const net = r2(it.quantity * it.unitPrice);
    const rate = kleinunternehmer ? 0 : it.taxRate;
    return { ...it, position: i + 1, net, rate };
  });
  const lineTotal = r2(lines.reduce((sum, l) => sum + l.net, 0));

  // Rabatt auf Dokumentebene, anteilig je Steuersatz
  const discountValue = Number(input.discountValue) || 0;
  let discountAmount = 0;
  if (discountValue > 0) {
    discountAmount =
      input.discountType === "PERCENT" ? r2(lineTotal * (discountValue / 100)) : Math.min(r2(discountValue), lineTotal);
  }

  const rates = Array.from(new Set(lines.map((l) => l.rate))).sort((a, c) => a - c);
  const groups: TaxGroup[] = rates.map((rate) => {
    const net = r2(lines.filter((l) => l.rate === rate).reduce((sum, l) => sum + l.net, 0));
    return { rate, net, allowance: 0, basis: net, tax: 0 };
  });
  if (discountAmount > 0 && lineTotal > 0) {
    let assigned = 0;
    groups.forEach((g, i) => {
      g.allowance = i === groups.length - 1 ? r2(discountAmount - assigned) : r2((g.net / lineTotal) * discountAmount);
      assigned = r2(assigned + g.allowance);
    });
  }
  for (const g of groups) {
    g.basis = r2(g.net - g.allowance);
    g.tax = kleinunternehmer ? 0 : r2((g.basis * g.rate) / 100);
  }
  const allowanceTotal = r2(groups.reduce((sum, g) => sum + g.allowance, 0));
  const taxBasisTotal = r2(lineTotal - allowanceTotal);
  const taxTotal = r2(groups.reduce((sum, g) => sum + g.tax, 0));
  const grandTotal = r2(taxBasisTotal + taxTotal);

  const exemptionReason = "Kleinunternehmerregelung: Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.";

  const lineXml = lines
    .map(
      (l) => `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument><ram:LineID>${l.position}</ram:LineID></ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct><ram:Name>${esc(l.description.slice(0, 500))}</ram:Name></ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice><ram:ChargeAmount>${price(l.unitPrice)}</ram:ChargeAmount></ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery><ram:BilledQuantity unitCode="${unitCode(l.unit)}">${qty(l.quantity)}</ram:BilledQuantity></ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>${category}</ram:CategoryCode>
          <ram:RateApplicablePercent>${amount(l.rate)}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>${amount(l.net)}</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`
    )
    .join("");

  const taxXml = groups
    .map(
      (g) => `
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${amount(g.tax)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>${kleinunternehmer ? `\n        <ram:ExemptionReason>${esc(exemptionReason)}</ram:ExemptionReason>` : ""}
        <ram:BasisAmount>${amount(g.basis)}</ram:BasisAmount>
        <ram:CategoryCode>${category}</ram:CategoryCode>
        <ram:RateApplicablePercent>${amount(g.rate)}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>`
    )
    .join("");

  const allowanceXml = groups
    .filter((g) => g.allowance > 0)
    .map(
      (g) => `
      <ram:SpecifiedTradeAllowanceCharge>
        <ram:ChargeIndicator><udt:Indicator>false</udt:Indicator></ram:ChargeIndicator>
        <ram:ActualAmount>${amount(g.allowance)}</ram:ActualAmount>
        <ram:ReasonCode>95</ram:ReasonCode>
        <ram:Reason>Rabatt</ram:Reason>
        <ram:CategoryTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>${category}</ram:CategoryCode>
          <ram:RateApplicablePercent>${amount(g.rate)}</ram:RateApplicablePercent>
        </ram:CategoryTradeTax>
      </ram:SpecifiedTradeAllowanceCharge>`
    )
    .join("");

  const sellerTax = [
    !blank(s.vatId) ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${esc(s.vatId!.trim())}</ram:ID></ram:SpecifiedTaxRegistration>` : "",
    !blank(s.taxNumber) ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="FC">${esc(s.taxNumber!.trim())}</ram:ID></ram:SpecifiedTaxRegistration>` : "",
  ].join("");

  const buyerReference = (b.reference && b.reference.trim()) || b.customerNumber || input.invoiceNumber;
  const dueText = input.dueDate ? `Zahlbar bis ${input.dueDate.toLocaleDateString("de-DE")}.` : "Zahlbar nach Rechnungserhalt.";

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>${GUIDELINE}</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${esc(input.invoiceNumber)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime><udt:DateTimeString format="102">${date102(input.issueDate)}</udt:DateTimeString></ram:IssueDateTime>${
      input.note && input.note.trim()
        ? `\n    <ram:IncludedNote><ram:Content>${esc(input.note.trim().slice(0, 1000))}</ram:Content></ram:IncludedNote>`
        : ""
    }
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>${lineXml}
    <ram:ApplicableHeaderTradeAgreement>
      <ram:BuyerReference>${esc(buyerReference)}</ram:BuyerReference>
      <ram:SellerTradeParty>
        <ram:Name>${esc(s.name)}</ram:Name>
        <ram:DefinedTradeContact>
          <ram:PersonName>${esc(s.contactName || s.name)}</ram:PersonName>
          <ram:TelephoneUniversalCommunication><ram:CompleteNumber>${esc(s.phone!.trim())}</ram:CompleteNumber></ram:TelephoneUniversalCommunication>
          <ram:EmailURIUniversalCommunication><ram:URIID>${esc(s.email!.trim())}</ram:URIID></ram:EmailURIUniversalCommunication>
        </ram:DefinedTradeContact>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${esc(s.zip!.trim())}</ram:PostcodeCode>
          <ram:LineOne>${esc(s.address!.trim())}</ram:LineOne>
          <ram:CityName>${esc(s.city!.trim())}</ram:CityName>
          <ram:CountryID>${countryCode(s.country)}</ram:CountryID>
        </ram:PostalTradeAddress>
        <ram:URIUniversalCommunication><ram:URIID schemeID="EM">${esc(s.email!.trim())}</ram:URIID></ram:URIUniversalCommunication>
        ${sellerTax}
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${esc(b.name)}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${esc(b.zip!.trim())}</ram:PostcodeCode>
          <ram:LineOne>${esc(b.address!.trim())}</ram:LineOne>
          <ram:CityName>${esc(b.city!.trim())}</ram:CityName>
          <ram:CountryID>${countryCode(b.country)}</ram:CountryID>
        </ram:PostalTradeAddress>
        <ram:URIUniversalCommunication><ram:URIID schemeID="EM">${esc(b.email!.trim())}</ram:URIID></ram:URIUniversalCommunication>${
          !blank(b.vatId) ? `\n        <ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${esc(b.vatId!.trim())}</ram:ID></ram:SpecifiedTaxRegistration>` : ""
        }
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery>
      <ram:ActualDeliverySupplyChainEvent>
        <ram:OccurrenceDateTime><udt:DateTimeString format="102">${date102(input.issueDate)}</udt:DateTimeString></ram:OccurrenceDateTime>
      </ram:ActualDeliverySupplyChainEvent>
    </ram:ApplicableHeaderTradeDelivery>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:PaymentReference>${esc(input.invoiceNumber)}</ram:PaymentReference>
      <ram:InvoiceCurrencyCode>${currency}</ram:InvoiceCurrencyCode>
      <ram:SpecifiedTradeSettlementPaymentMeans>
        <ram:TypeCode>58</ram:TypeCode>
        <ram:PayeePartyCreditorFinancialAccount><ram:IBANID>${esc(s.iban!.replace(/\s+/g, ""))}</ram:IBANID></ram:PayeePartyCreditorFinancialAccount>
      </ram:SpecifiedTradeSettlementPaymentMeans>${taxXml}${allowanceXml}
      <ram:SpecifiedTradePaymentTerms>
        <ram:Description>${esc(dueText)}</ram:Description>${
          input.dueDate
            ? `\n        <ram:DueDateDateTime><udt:DateTimeString format="102">${date102(input.dueDate)}</udt:DateTimeString></ram:DueDateDateTime>`
            : ""
        }
      </ram:SpecifiedTradePaymentTerms>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${amount(lineTotal)}</ram:LineTotalAmount>${
          allowanceTotal > 0 ? `\n        <ram:AllowanceTotalAmount>${amount(allowanceTotal)}</ram:AllowanceTotalAmount>` : ""
        }
        <ram:TaxBasisTotalAmount>${amount(taxBasisTotal)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="${currency}">${amount(taxTotal)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${amount(grandTotal)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${amount(grandTotal)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>
`;

  return { xml, problems: [] };
}
