import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

type Item = { description: string; quantity: number; unit: string; unitPrice: number };

type CompanyInfo = {
  name: string;
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
  documentIntroText?: string | null;
};

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
}) {
  const accent = company.documentAccentColor || "#2F5FFF";
  const showVat = company.showVatOnDocuments !== false;

  const styles = StyleSheet.create({
    page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1C2128" },
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 25 },
    logo: { width: 70, height: 70, objectFit: "contain" },
    companyName: { fontSize: 13, fontWeight: 700, color: "#1C2128", marginBottom: 3 },
    companyBlock: { fontSize: 9, color: "#5B636D" },
    title: { fontSize: 18, fontWeight: 700, marginBottom: 4, color: accent },
    meta: { fontSize: 9, color: "#5B636D", marginBottom: 20 },
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
    colPrice: { flex: 1.5, textAlign: "right" },
    colTotal: { flex: 1.5, textAlign: "right" },
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
            <Text style={styles.companyName}>{company.name}</Text>
            <View style={styles.companyBlock}>
              {company.address && <Text>{company.address}</Text>}
              {(company.zip || company.city) && (
                <Text>{[company.zip, company.city].filter(Boolean).join(" ")}</Text>
              )}
              {company.taxNumber && <Text>Steuernummer: {company.taxNumber}</Text>}
              {company.vatId && <Text>USt-IdNr.: {company.vatId}</Text>}
            </View>
          </View>
          {company.logoUrl && <Image src={company.logoUrl} style={styles.logo} />}
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

        <View style={styles.customerBlock}>
          <Text>{customer.name}</Text>
          {customer.address && <Text>{customer.address}</Text>}
          {(customer.zip || customer.city) && (
            <Text>{[customer.zip, customer.city].filter(Boolean).join(" ")}</Text>
          )}
        </View>

        {company.documentIntroText && <Text style={styles.intro}>{company.documentIntroText}</Text>}

        <Text style={styles.subject}>{title}</Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colDesc, styles.headerCell]}>BESCHREIBUNG</Text>
            <Text style={[styles.colQty, styles.headerCell]}>MENGE</Text>
            <Text style={[styles.colUnit, styles.headerCell]}>EINHEIT</Text>
            <Text style={[styles.colPrice, styles.headerCell]}>EINZELPREIS</Text>
            <Text style={[styles.colTotal, styles.headerCell]}>SUMME</Text>
          </View>
          {items.map((item, i) => (
            <View style={styles.tableRow} key={i}>
              <Text style={styles.colDesc}>{item.description}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colUnit}>{item.unit}</Text>
              <Text style={styles.colPrice}>{item.unitPrice.toLocaleString("de-DE")} €</Text>
              <Text style={styles.colTotal}>
                {(item.quantity * item.unitPrice).toLocaleString("de-DE")} €
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.summary}>
          {showVat ? (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Netto</Text>
                <Text style={styles.summaryValue}>{totalNet.toLocaleString("de-DE")} €</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>MwSt. ({taxRate}%)</Text>
                <Text style={styles.summaryValue}>
                  {(totalGross - totalNet).toLocaleString("de-DE")} €
                </Text>
              </View>
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
          {company.invoiceFooterText && <Text style={{ marginBottom: 4 }}>{company.invoiceFooterText}</Text>}
          <Text>
            {company.name}
            {company.bankName ? `   ·   ${company.bankName}` : ""}
            {company.iban ? `   ·   IBAN: ${company.iban}` : ""}
            {company.bic ? `   ·   BIC: ${company.bic}` : ""}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
