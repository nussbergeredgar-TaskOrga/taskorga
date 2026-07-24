import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getServerSession, type Session } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// Serverless-Funktionen bei Vercel haben standardmäßig ein Request-Body-Limit
// von ca. 4,5 MB. Für den MVP reicht das für Rechnungen/Angebote als PDF.
const MAX_SIZE = 4.5 * 1024 * 1024;

export async function POST(request: Request) {
  const session = (await getServerSession(authOptions)) as Session | null;
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Keine Datei erhalten." }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Datei ist zu groß (max. 4,5 MB in dieser Version)." },
      { status: 413 }
    );
  }

  const blob = await put(`${session.user.companyId}/${Date.now()}-${file.name}`, file, {
    access: "public",
    addRandomSuffix: true,
  });

  return NextResponse.json({
    url: blob.url,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    fileSize: file.size,
  });
}
