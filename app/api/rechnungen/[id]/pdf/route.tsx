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

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      company: true,
      items: { orderBy: { position: "asc" } },
    },
  });

  if (!invoice || invoice.companyId !== session.user.companyId) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  const template = await prisma.documentTemplate.findFirst({
    where: { companyId: invoice.companyId, type: "INVOICE", isDefault: true },
  });
  const company = await resolveCompanyLogoUrl(invoice.company);

  const createdAtStr = (invoice.issueDate ?? invoice.createdAt).toLocaleDateString("de-DE");
  const dueDateStr = invoice.dueDate ? invoice.dueDate.toLocaleDateString("de-DE") : undefined;
  const title = `Rechnung ${invoice.number}`;

  const context = buildPlaceholderContext({
    company: invoice.company,
    customer: invoice.customer,
    number: invoice.number,
    title,
    createdAt: createdAtStr,
    validUntilOrDue: dueDateStr,
    totalNet: Number(invoice.totalNet),
    totalGross: Number(invoice.totalGross),
  });

  const buffer = await renderToBuffer(
    <DocumentPdf
      kind="Rechnung"
      number={invoice.number}
      title={title}
      createdAt={createdAtStr}
      validUntilOrDue={dueDateStr}
      company={company}
      customer={invoice.customer}
      items={invoice.items.map((i) => ({
        description: i.description,
        quantity: Number(i.quantity),
        unit: i.unit,
        unitPrice: Number(i.unitPrice),
        taxRate: Number(i.taxRate),
      }))}
      totalNet={Number(invoice.totalNet)}
      totalGross={Number(invoice.totalGross)}
      taxRate={Number(invoice.taxRate)}
      discountValue={invoice.discountValue != null ? Number(invoice.discountValue) : undefined}
      discountType={invoice.discountType as "AMOUNT" | "PERCENT"}
      introTextOverride={template?.introText ? resolvePlaceholders(template.introText, context) : undefined}
      footerTextOverride={template?.footerText ? resolvePlaceholders(template.footerText, context) : undefined}
      showVatOverride={template?.showVat}
      accentColorOverride={template?.accentColor}
    />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.number}.pdf"`,
    },
  });
}
