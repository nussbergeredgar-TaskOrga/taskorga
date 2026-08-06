import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

type Item = { description: string; quantity: number; unit: string; unitPrice: number; taxRate?: number };

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
  address?: string | null;
  zip?: string | null;
  city?: string | null;
};

export function DocumentPdf({
  kind,
  number,
  title,
  createdAt,
  validUntilOrDue,
  company,
  customer,
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
}: {
  kind: "Angebot" | "Rechnung";
  number: string;
  title: string;
  createdAt: string;
  validUntilOrDue?: string;
  company: CompanyInfo;
  customer: CustomerInfo;
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
}) {
  const accent = accentColorOverride || company.documentAccentColor || "#2F5FFF";
  const showVat = showVatOverride ?? company.showVatOnDocuments !== false;
  const introText = introTextOverride;
  const footerText = footerTextOverride ?? company.invoiceFooterText;
  const senderLine = [company.name, company.address, [company.zip, company.city].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(" · ");

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

  const styles = StyleSheet.create({
    page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1C2128" },
    headerRow:
      logoPosition === "TOP_CENTER"
        ? { flexDirection: "column", alignItems: "center", marginBottom: 25 }
        : {
            flexDirection: logoPosition === "TOP_LEFT" ? "row-reverse" : "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 25,
          },
    logo: logoPosition === "TOP_CENTER" ? { width: 70, height: 70, objectFit: "contain", marginBottom: 8 } : { width: 70, height: 70, objectFit: "contain" },
    companyName: { fontSize: 13, fontWeight: 700, color: "#1C2128", marginBottom: 3 },
    companyBlock: { fontSize: 9, color: "#5B636D" },
    companyBlockCenter: { fontSize: 9, color: "#5B636D", textAlign: "center" },
    title: { fontSize: 18, fontWeight: 700, marginBottom: 4, color: accent },
    meta: { fontSize: 9, color: "#5B636D", marginBottom: 20 },
    senderLine: { fontSize: 7, color: "#A8AFB8", marginBottom: 4 },
    customerBlock: { marginBottom: 20, fontSize: 10 },
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
    footer: {
      position: "absolute",
      bottom: 30,
      left: 40,
      right: 40,
      fontSize: 8,
      color: "#A8AFB8",
      borderTopWidth: 0.5,
      borderTopColor: "#E8EAED",
      paddingTop: 8,
    },
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={logoPosition === "TOP_CENTER" ? [styles.companyName, { textAlign: "center" }] : styles.companyName}>
              {company.name}
            </Text>
            <View style={logoPosition === "TOP_CENTER" ? styles.companyBlockCenter : styles.companyBlock}>
              {company.address && <Text>{company.address}</Text>}
              {(company.zip || company.city) && (
                <Text>{[company.zip, company.city].filter(Boolean).join(" ")}</Text>
              )}
              {company.taxNumber && <Text>Steuernummer: {company.taxNumber}</Text>}
              {company.vatId && <Text>USt-IdNr.: {company.vatId}</Text>}
              {showCompanyEmail && company.email && <Text>{company.email}</Text>}
            </View>
          </View>
          {logoPosition !== "HIDDEN" && company.logoUrl && <Image src={company.logoUrl} style={styles.logo} />}
        </View>

        <Text style={styles.title}>
          {kind} {number}
        </Text>
        <Text style={styles.meta}>
          Datum: {createdAt}
          {validUntilOrDue
            ? `   ${kind === "Angebot" ? "Gültig bis" : "Fällig am"}: ${validUntilOrDue}`
            : ""}
        </Text>

        {showSenderLine && senderLine && <Text style={styles.senderLine}>{senderLine}</Text>}

        <View style={styles.customerBlock}>
          <Text>{customer.name}</Text>
          {customer.address && <Text>{customer.address}</Text>}
          {(customer.zip || customer.city) && (
            <Text>{[customer.zip, customer.city].filter(Boolean).join(" ")}</Text>
          )}
        </View>

        {introText && <Text style={styles.intro}>{introText}</Text>}

        <Text style={styles.subject}>{title}</Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colDesc, styles.headerCell]}>BESCHREIBUNG</Text>
            <Text style={[styles.colQty, styles.headerCell]}>MENGE</Text>
            <Text style={[styles.colUnit, styles.headerCell]}>EINHEIT</Text>
            <Text style={[styles.colPrice, styles.headerCell]}>EINZELPREIS</Text>
            {showVat && <Text style={[styles.colVat, styles.headerCell]}>MWST.</Text>}
            <Text style={[styles.colTotal, styles.headerCell]}>SUMME</Text>
          </View>
          {items.map((item, i) => (
            <View style={styles.tableRow} key={i}>
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

        <View style={styles.footer}>
          {footerText && <Text style={{ marginBottom: 4 }}>{footerText}</Text>}
          <Text>
            {company.name}
            {showCompanyEmail && company.email ? `   ·   ${company.email}` : ""}
            {showBankDetails && company.bankName ? `   ·   ${company.bankName}` : ""}
            {showBankDetails && company.iban ? `   ·   IBAN: ${company.iban}` : ""}
            {showBankDetails && company.bic ? `   ·   BIC: ${company.bic}` : ""}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
