import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DocumentPdf, type LogoPosition } from "@/lib/pdf/document-pdf";
import { buildPlaceholderContext } from "@/lib/pdf/build-context";
import { resolvePlaceholders } from "@/lib/document-placeholders";
import { resolveCompanyLogoUrl } from "@/lib/blob-signed-url";
import { hasPermission } from "@/lib/permissions";

const SAMPLE_CUSTOMER = {
  name: "Max Mustermann",
  firstName: "Max",
  address: "Musterstraße 12",
  zip: "12345",
  city: "Musterstadt",
  email: "max.mustermann@example.com",
  phone: "0170 1234567",
  salutation: "HERR" as const,
  lastName: "Mustermann",
};

const SAMPLE_CUSTOMER_NUMBER = "KD-0001";
const SAMPLE_CREATOR_NAME = "Erika Musterfrau";

const SAMPLE_ITEMS = [
  { description: "Anfahrt und Vorbereitung", quantity: 1, unit: "Pauschale", unitPrice: 45, taxRate: 19 },
  { description: "Montage Wallbox", quantity: 3, unit: "Std.", unitPrice: 75, taxRate: 19 },
  { description: "Material", quantity: 1, unit: "Pauschale", unitPrice: 180, taxRate: 19 },
];

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, include: { role: true } });
  if (!hasPermission(user?.role, "dokumentVorlagen")) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const company = await prisma.company.findUnique({ where: { id: session.user.companyId } });
  if (!company) {
    return NextResponse.json({ error: "Firma nicht gefunden." }, { status: 404 });
  }

  const body = await request.json();
  const kind: "QUOTE" | "INVOICE" = body.kind === "INVOICE" ? "INVOICE" : "QUOTE";
  const number = kind === "QUOTE" ? "ANG-2026-0001" : "RE-2026-0001";
  const title = kind === "QUOTE" ? "Wallbox-Installation" : "Rechnung Wallbox-Installation";
  const createdAt = new Date().toLocaleDateString("de-DE");

  const netTotal = SAMPLE_ITEMS.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const grossTotal = netTotal * 1.19;

  const pdfCompany = await resolveCompanyLogoUrl(company);

  const context = buildPlaceholderContext({
    company,
    customer: SAMPLE_CUSTOMER,
    number,
    title,
    createdAt,
    validUntilOrDue: kind === "QUOTE" ? "in 30 Tagen" : "in 14 Tagen",
    totalNet: netTotal,
    totalGross: grossTotal,
  });

  const introText = body.introText ? resolvePlaceholders(String(body.introText), context) : undefined;
  const footerText = body.footerText ? resolvePlaceholders(String(body.footerText), context) : undefined;

  const buffer = await renderToBuffer(
    <DocumentPdf
      kind={kind === "QUOTE" ? "Angebot" : "Rechnung"}
      number={number}
      title={title}
      createdAt={createdAt}
      validUntilOrDue={kind === "QUOTE" ? "in 30 Tagen" : "in 14 Tagen"}
      company={pdfCompany}
      customer={SAMPLE_CUSTOMER}
      customerNumber={SAMPLE_CUSTOMER_NUMBER}
      creatorName={SAMPLE_CREATOR_NAME}
      items={SAMPLE_ITEMS}
      totalNet={netTotal}
      totalGross={grossTotal}
      taxRate={19}
      introTextOverride={introText}
      footerTextOverride={footerText}
      showVatOverride={Boolean(body.showVat)}
      accentColorOverride={typeof body.accentColor === "string" ? body.accentColor : undefined}
      logoPosition={body.logoPosition as LogoPosition | undefined}
      showSenderLine={Boolean(body.showSenderLine)}
      showBankDetails={Boolean(body.showBankDetails)}
      showCompanyEmail={Boolean(body.showCompanyEmail)}
      coloredHeaderFooterOverride={body.coloredHeaderFooter === undefined ? undefined : Boolean(body.coloredHeaderFooter)}
      showPositionNumbersOverride={body.showPositionNumbers === undefined ? undefined : Boolean(body.showPositionNumbers)}
      showCustomerNumberOverride={body.showCustomerNumber === undefined ? undefined : Boolean(body.showCustomerNumber)}
      showCreatorOverride={body.showCreator === undefined ? undefined : Boolean(body.showCreator)}
    />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: { "Content-Type": "application/pdf" },
  });
}
