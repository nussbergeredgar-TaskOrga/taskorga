import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSignedFileUrl, pathnameFromBlobUrl } from "@/lib/blob-signed-url";

// Stabile, eingeloggte Weiterleitung auf ein Dokument: der Store ist privat,
// die gespeicherte fileUrl allein reicht nicht mehr zum Anzeigen. Bei jedem
// Aufruf wird frisch eine kurzlebige, signierte URL ausgestellt und dorthin
// weitergeleitet -- so bleiben bestehende Links (E-Mails, gespeicherte
// Lesezeichen) auf Dauer funktionsfaehig statt nach Ablauf der Signatur tot zu sein.
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const doc = await prisma.document.findFirst({
    where: { id: params.id, companyId: session.user.companyId },
  });
  if (!doc) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  const url = await getSignedFileUrl(pathnameFromBlobUrl(doc.fileUrl));
  return NextResponse.redirect(url);
}
