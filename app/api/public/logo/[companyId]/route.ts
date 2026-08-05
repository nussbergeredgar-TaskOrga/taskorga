import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSignedFileUrl, pathnameFromBlobUrl } from "@/lib/blob-signed-url";

// Bewusst ohne Login-Pruefung: das Firmenlogo ist unkritisch und muss auch
// von aussen ladbar sein (E-Mail-Clients der Kunden, generierte PDFs). Der
// Store ist privat, daher wird bei jedem Abruf frisch eine kurzlebige,
// signierte URL ausgestellt und dorthin weitergeleitet -- so bleibt z.B. ein
// vor Wochen verschicktes E-Mail-Signatur-Bild dauerhaft ladbar.
export async function GET(request: Request, { params }: { params: { companyId: string } }) {
  const company = await prisma.company.findUnique({
    where: { id: params.companyId },
    select: { logoUrl: true },
  });
  if (!company?.logoUrl) {
    return NextResponse.json({ error: "Kein Logo hinterlegt." }, { status: 404 });
  }

  const url = await getSignedFileUrl(pathnameFromBlobUrl(company.logoUrl), 15 * 60 * 1000);
  return NextResponse.redirect(url);
}
