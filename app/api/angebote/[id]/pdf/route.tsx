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

  const buffer = await renderToBuffer(
    <DocumentPdf
      kind="Angebot"
      number={quote.number}
      title={quote.title}
      createdAt={quote.createdAt.toLocaleDateString("de-DE")}
      validUntilOrDue={quote.validUntil ? quote.validUntil.toLocaleDateString("de-DE") : undefined}
      company={quote.company}
      customer={quote.customer}
      items={quote.items.map((i) => ({
        description: i.description,
        quantity: Number(i.quantity),
        unit: i.unit,
        unitPrice: Number(i.unitPrice),
      }))}
      totalNet={Number(quote.totalNet)}
      totalGross={Number(quote.totalGross)}
      taxRate={Number(quote.taxRate)}
    />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${quote.number}.pdf"`,
    },
  });
}
