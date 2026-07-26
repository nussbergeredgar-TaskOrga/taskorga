import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DocumentPdf } from "@/lib/pdf/document-pdf";

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

  const buffer = await renderToBuffer(
    <DocumentPdf
      kind="Rechnung"
      number={invoice.number}
      title={`Rechnung ${invoice.number}`}
      createdAt={(invoice.issueDate ?? invoice.createdAt).toLocaleDateString("de-DE")}
      validUntilOrDue={invoice.dueDate ? invoice.dueDate.toLocaleDateString("de-DE") : undefined}
      company={invoice.company}
      customer={invoice.customer}
      items={invoice.items.map((i) => ({
        description: i.description,
        quantity: Number(i.quantity),
        unit: i.unit,
        unitPrice: Number(i.unitPrice),
      }))}
      totalNet={Number(invoice.totalNet)}
      totalGross={Number(invoice.totalGross)}
      taxRate={Number(invoice.taxRate)}
    />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.number}.pdf"`,
    },
  });
}
