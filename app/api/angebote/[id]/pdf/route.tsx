import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DocumentPdf } from "@/lib/pdf/document-pdf";
import { buildPlaceholderContext } from "@/lib/pdf/build-context";
import { resolvePlaceholders } from "@/lib/document-placeholders";
import { resolveCompanyLogoUrl } from "@/lib/blob-signed-url";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      company: true,
      items: { orderBy: { position: "asc" } },
    },
  });

  if (!quote || quote.companyId !== session.user.companyId) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  const template = await prisma.documentTemplate.findFirst({
    where: { companyId: quote.companyId, type: "QUOTE", isDefault: true },
  });
  const company = await resolveCompanyLogoUrl(quote.company);

  const createdAtStr = quote.createdAt.toLocaleDateString("de-DE");
  const validUntilStr = quote.validUntil ? quote.validUntil.toLocaleDateString("de-DE") : undefined;

  const context = buildPlaceholderContext({
    company: quote.company,
    customer: quote.customer,
    number: quote.number,
    title: quote.title,
    createdAt: createdAtStr,
    validUntilOrDue: validUntilStr,
    totalNet: Number(quote.totalNet),
    totalGross: Number(quote.totalGross),
  });

  const buffer = await renderToBuffer(
    <DocumentPdf
      kind="Angebot"
      number={quote.number}
      title={quote.title}
      createdAt={createdAtStr}
      validUntilOrDue={validUntilStr}
      company={company}
      customer={quote.customer}
      items={quote.items.map((i) => ({
        description: i.description,
        quantity: Number(i.quantity),
        unit: i.unit,
        unitPrice: Number(i.unitPrice),
        taxRate: Number(i.taxRate),
      }))}
      totalNet={Number(quote.totalNet)}
      totalGross={Number(quote.totalGross)}
      taxRate={Number(quote.taxRate)}
      discountValue={quote.discountValue != null ? Number(quote.discountValue) : undefined}
      discountType={quote.discountType as "AMOUNT" | "PERCENT"}
      introTextOverride={template?.introText ? resolvePlaceholders(template.introText, context) : undefined}
      footerTextOverride={template?.footerText ? resolvePlaceholders(template.footerText, context) : undefined}
      showVatOverride={template?.showVat}
      accentColorOverride={template?.accentColor}
      logoPosition={template?.logoPosition}
      showSenderLine={template?.showSenderLine}
      showBankDetails={template?.showBankDetails}
      showCompanyEmail={template?.showCompanyEmail}
    />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${quote.number}.pdf"`,
    },
  });
}
