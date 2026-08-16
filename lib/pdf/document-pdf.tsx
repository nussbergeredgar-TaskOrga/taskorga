import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

type Item = { description: string; quantity: number; unit: string; unitPrice: number; taxRate?: number; position?: number };

type CompanyInfo = {
  name: string;
  email?: string | null;
  address?: string | null;
  zip?: string | null;
  city?: string | null;
  taxNumber?: string | null;
  vatId?: string | null;
  bankName?: string | null;
  iban?: string | null;
  bic?: string | null;
  invoiceFooterText?: string | null;
  logoUrl?: string | null;
  showVatOnDocuments?: boolean;
  documentAccentColor?: string | null;
};

export type LogoPosition = "TOP_LEFT" | "TOP_RIGHT" | "TOP_CENTER" | "HIDDEN";

type CustomerInfo = {
  name: string;
  firstName?: string | null;
  address?: string | null;
  zip?: string | null;
  city?: string | null;
};

type ContactInfo = { name: string };

export function DocumentPdf({
  kind,
  number,
  title,
  createdAt,
  validUntilOrDue,
  company,
  customer,
  contact,
  customerNumber,
  creatorName,
  items,
  totalNet,
  totalGross,
  taxRate,
  discountValue,
  discountType,
  introTextOverride,
  footerTextOverride,
  showVatOverride,
  accentColorOverride,
  logoPosition = "TOP_RIGHT",
  showSenderLine = false,
  showBankDetails = true,
  showCompanyEmail = false,
  coloredHeaderFooterOverride,
  showPositionNumbersOverride,
  showCustomerNumberOverride,
  showCreatorOverride,
}: {
  kind: "Angebot" | "Rechnung";
  number: string;
  title: string;
  createdAt: string;
  validUntilOrDue?: string;
  company: CompanyInfo;
  customer: CustomerInfo;
  contact?: ContactInfo | null;
  customerNumber?: string | null;
  creatorName?: string | null;
  items: Item[];
  totalNet: number;
  totalGross: number;
  taxRate: number;
  discountValue?: number;
  discountType?: "AMOUNT" | "PERCENT";
  introTextOverride?: string | null;
  footerTextOverride?: string | null;
  showVatOverride?: boolean;
  accentColorOverride?: string | null;
  logoPosition?: LogoPosition;
  showSenderLine?: boolean;
  showBankDetails?: boolean;
  showCompanyEmail?: boolean;
  coloredHeaderFooterOverride?: boolean;
  showPositionNumbersOverride?: boolean;
  showCustomerNumberOverride?: boolean;
  showCreatorOverride?: boolean;
}) {
  const accent = accentColorOverride || company.documentAccentColor || "#2F5FFF";
  const showVat = showVatOverride ?? company.showVatOnDocuments !== false;
  const introText = introTextOverride;
  const footerText = footerTextOverride ?? company.invoiceFooterText;
  const senderLine = [company.name, company.address, [company.zip, company.city].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(" · ");

  const colored = coloredHeaderFooterOverride ?? true;
  const showPositionNumbers = showPositionNumbersOverride ?? true;
  const showCustomerNumberBlock = (showCustomerNumberOverride ?? true) && !!customerNumber;
  const showCreatorBlock = (showCreatorOverride ?? true) && !!creatorName;

  const greetingSource = contact?.name?.trim() || customer.firstName?.trim() || customer.name;
  const greetingFirstName = greetingSource.split(" ")[0];

  // Netto/MwSt je Steuersatz gruppieren (Positionen können unterschiedliche Sätze haben)
  const netBeforeDiscount = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const discountAmount = discountValue
    ? discountType === "PERCENT"
      ? netBeforeDiscount * (discountValue / 100)
      : discountValue
    : 0;
  // Bei 0 geclampt, damit ein Rabatt, der den Nettowert übersteigt, nicht zu
  // negativen Zeilen im Kunden-PDF führt (analog zur Berechnung in quotes.tsx/invoices.tsx).
  const netAfterDiscount = Math.max(0, netBeforeDiscount - discountAmount);
  const discountFactor = netBeforeDiscount > 0 ? netAfterDiscount / netBeforeDiscount : 1;

  const rateGroups = new Map<number, { net: number }>();
  for (const item of items) {
    const rate = item.taxRate ?? taxRate;
    const net = item.quantity * item.unitPrice * discountFactor;
    const existing = rateGroups.get(rate);
    rateGroups.set(rate, { net: (existing?.net ?? 0) + net });
  }
  const rateRows = Array.from(rateGroups.entries())
    .map(([rate, { net }]) => ({ rate, net, vat: net * (rate / 100) }))
    .sort((a, b) => b.rate - a.rate);

  const bandText = colored ? "#FFFFFF" : "#1C2128";
  const bandSubText = colored ? "#DCE4FF" : "#5B636D";

  const styles = StyleSheet.create({
    page: { padding: 0, fontSize: 10, fontFamily: "Helvetica", color: "#1C2128" },
    headerBand: {
      backgroundColor: colored ? accent : "#FFFFFF",
      borderBottomWidth: colored ? 0 : 0.5,
      borderBottomColor: "#E8EAED",
      paddingHorizontal: 40,
      paddingVertical: 20,
    },
    headerRow:
      logoPosition === "TOP_CENTER"
        ? { flexDirection: "column", alignItems: "center" }
        : {
            flexDirection: logoPosition === "TOP_LEFT" ? "row-reverse" : "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
          },
    logo: { width: 44, height: 44, objectFit: "contain", borderRadius: 6 },
    companyName: { fontSize: 14, fontWeight: 700, color: bandText, marginBottom: 3 },
    companyBlock: { fontSize: 9, color: bandSubText },
    body: { paddingHorizontal: 40, paddingTop: 24, paddingBottom: 90, flexGrow: 1 },
    metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
    infoBlock: { alignItems: "flex-end", marginTop: 3 },
    infoLine: { fontSize: 8.5, color: "#5B636D", marginBottom: 1.5 },
    title: { fontSize: 18, fontWeight: 700, color: accent },
    senderLine: { fontSize: 7, color: "#A8AFB8", marginBottom: 4 },
    customerBlock: { marginBottom: 14, fontSize: 10 },
    greeting: { fontSize: 10, marginBottom: 10 },
    intro: { fontSize: 10, marginBottom: 15, lineHeight: 1.4 },
    subject: { fontSize: 11, fontWeight: 700, marginBottom: 10 },
    table: { width: "100%", marginBottom: 20 },
    tableHeader: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: accent,
      paddingBottom: 5,
      marginBottom: 5,
    },
    tableRow: {
      flexDirection: "row",
      paddingVertical: 5,
      borderBottomWidth: 0.5,
      borderBottomColor: "#E8EAED",
    },
    colPos: { flex: 0.4, color: "#5B636D" },
    colDesc: { flex: 4 },
    colQty: { flex: 1, textAlign: "right" },
    colUnit: { flex: 1, textAlign: "right" },
    colPrice: { flex: 1.3, textAlign: "right" },
    colVat: { flex: 0.8, textAlign: "right" },
    colTotal: { flex: 1.3, textAlign: "right" },
    headerCell: { fontSize: 8, fontWeight: 700, color: "#5B636D" },
    summary: { alignItems: "flex-end", marginTop: 10 },
    summaryRow: { flexDirection: "row", width: 220, justifyContent: "space-between", marginBottom: 3 },
    summaryLabel: { fontSize: 9, color: "#5B636D" },
    summaryValue: { fontSize: 9 },
    grossRow: {
      flexDirection: "row",
      width: 220,
      justifyContent: "space-between",
      marginTop: 5,
      paddingTop: 5,
      borderTopWidth: 1,
      borderTopColor: accent,
    },
    grossLabel: { fontSize: 11, fontWeight: 700 },
    grossValue: { fontSize: 11, fontWeight: 700 },
    vatNote: { fontSize: 8, color: "#5B636D", marginTop: 6, textAlign: "right" },
    footerBand: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colored ? accent : "#FFFFFF",
      borderTopWidth: colored ? 0 : 0.5,
      borderTopColor: "#E8EAED",
      paddingHorizontal: 40,
      paddingVertical: 14,
    },
    footerRow: { flexDirection: "row", justifyContent: "space-between" },
    footerText: { fontSize: 8, color: bandSubText, marginBottom: 3 },
    footerCompanyName: { fontSize: 9, fontWeight: 700, color: bandText },
    footerLine: { fontSize: 8, color: bandSubText, textAlign: "right", marginBottom: 1.5 },
  });

  const infoLines = (
    <View style={styles.infoBlock}>
      {showCustomerNumberBlock && <Text style={styles.infoLine}>Kundennummer: {customerNumber}</Text>}
      {showCreatorBlock && <Text style={styles.infoLine}>Ersteller: {creatorName}</Text>}
      <Text style={styles.infoLine}>Datum: {createdAt}</Text>
      {validUntilOrDue && (
        <Text style={styles.infoLine}>
          {kind === "Angebot" ? "Gültig bis" : "Fällig am"}: {validUntilOrDue}
        </Text>
      )}
    </View>
  );

  const logoImage = logoPosition !== "HIDDEN" && company.logoUrl ? <Image src={company.logoUrl} style={styles.logo} /> : null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBand}>
          {logoPosition === "TOP_CENTER" ? (
            <View style={styles.headerRow}>
              {logoImage}
              <Text style={[styles.companyName, { textAlign: "center", marginTop: logoImage ? 8 : 0 }]}>
                {company.name}
              </Text>
              <View style={{ alignItems: "center" }}>
                {company.address && <Text style={[styles.companyBlock, { textAlign: "center" }]}>{company.address}</Text>}
                {(company.zip || company.city) && (
                  <Text style={[styles.companyBlock, { textAlign: "center" }]}>
                    {[company.zip, company.city].filter(Boolean).join(" ")}
                  </Text>
                )}
                {showCompanyEmail && company.email && (
                  <Text style={[styles.companyBlock, { textAlign: "center" }]}>{company.email}</Text>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.companyName}>{company.name}</Text>
                <View style={styles.companyBlock}>
                  {company.address && <Text>{company.address}</Text>}
                  {(company.zip || company.city) && <Text>{[company.zip, company.city].filter(Boolean).join(" ")}</Text>}
                  {showCompanyEmail && company.email && <Text>{company.email}</Text>}
                </View>
              </View>
              {logoImage}
            </View>
          )}
        </View>

        <View style={styles.body}>
          <View style={styles.metaRow}>
            <Text style={styles.title}>
              {kind} {number}
            </Text>
            {infoLines}
          </View>

          {showSenderLine && senderLine && <Text style={styles.senderLine}>{senderLine}</Text>}

          <View style={styles.customerBlock}>
            <Text>{customer.name}</Text>
            {contact?.name && <Text>z. Hd. {contact.name}</Text>}
            {customer.address && <Text>{customer.address}</Text>}
            {(customer.zip || customer.city) && (
              <Text>{[customer.zip, customer.city].filter(Boolean).join(" ")}</Text>
            )}
          </View>

          <Text style={styles.greeting}>Hallo {greetingFirstName},</Text>

          {introText && <Text style={styles.intro}>{introText}</Text>}

          <Text style={styles.subject}>{title}</Text>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              {showPositionNumbers && <Text style={[styles.colPos, styles.headerCell]}>NR.</Text>}
              <Text style={[styles.colDesc, styles.headerCell]}>BESCHREIBUNG</Text>
              <Text style={[styles.colQty, styles.headerCell]}>MENGE</Text>
              <Text style={[styles.colUnit, styles.headerCell]}>EINHEIT</Text>
              <Text style={[styles.colPrice, styles.headerCell]}>EINZELPREIS</Text>
              {showVat && <Text style={[styles.colVat, styles.headerCell]}>MWST.</Text>}
              <Text style={[styles.colTotal, styles.headerCell]}>SUMME</Text>
            </View>
            {items.map((item, i) => (
              <View style={styles.tableRow} key={i}>
                {showPositionNumbers && <Text style={styles.colPos}>{item.position ?? i + 1}</Text>}
                <Text style={styles.colDesc}>{item.description}</Text>
                <Text style={styles.colQty}>{item.quantity}</Text>
                <Text style={styles.colUnit}>{item.unit}</Text>
                <Text style={styles.colPrice}>{item.unitPrice.toLocaleString("de-DE")} €</Text>
                {showVat && <Text style={styles.colVat}>{item.taxRate ?? taxRate}%</Text>}
                <Text style={styles.colTotal}>
                  {(item.quantity * item.unitPrice).toLocaleString("de-DE")} €
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.summary}>
            {discountValue ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  Rabatt {discountType === "PERCENT" ? `(${discountValue}%)` : ""}
                </Text>
                <Text style={styles.summaryValue}>
                  −{(netBeforeDiscount - netBeforeDiscount * discountFactor).toLocaleString("de-DE")} €
                </Text>
              </View>
            ) : null}

            {showVat ? (
              <>
                {rateRows.map((r) => (
                  <View key={r.rate} style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>
                      Netto {rateRows.length > 1 ? `(${r.rate}%)` : ""}
                    </Text>
                    <Text style={styles.summaryValue}>{r.net.toLocaleString("de-DE")} €</Text>
                  </View>
                ))}
                {rateRows.map((r) => (
                  <View key={`vat-${r.rate}`} style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>MwSt. ({r.rate}%)</Text>
                    <Text style={styles.summaryValue}>{r.vat.toLocaleString("de-DE")} €</Text>
                  </View>
                ))}
                <View style={styles.grossRow}>
                  <Text style={styles.grossLabel}>Gesamt</Text>
                  <Text style={styles.grossValue}>{totalGross.toLocaleString("de-DE")} €</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.grossRow}>
                  <Text style={styles.grossLabel}>Gesamtbetrag</Text>
                  <Text style={styles.grossValue}>{totalGross.toLocaleString("de-DE")} €</Text>
                </View>
                <Text style={styles.vatNote}>
                  Gemäß §19 UStG wird keine Umsatzsteuer berechnet.
                </Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.footerBand}>
          <View style={styles.footerRow}>
            <View style={{ flex: 1 }}>
              {footerText && <Text style={styles.footerText}>{footerText}</Text>}
              <Text style={styles.footerCompanyName}>{company.name}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              {company.taxNumber && <Text style={styles.footerLine}>Steuernummer: {company.taxNumber}</Text>}
              {company.vatId && <Text style={styles.footerLine}>USt-IdNr.: {company.vatId}</Text>}
              {showBankDetails && company.bankName && <Text style={styles.footerLine}>{company.bankName}</Text>}
              {showBankDetails && company.iban && <Text style={styles.footerLine}>IBAN: {company.iban}</Text>}
              {showBankDetails && company.bic && <Text style={styles.footerLine}>BIC: {company.bic}</Text>}
              {showCompanyEmail && company.email && <Text style={styles.footerLine}>{company.email}</Text>}
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
