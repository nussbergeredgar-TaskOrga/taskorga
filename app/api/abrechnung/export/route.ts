import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isBillingBlocked } from "@/lib/billing-lock";
import { confirmPassword } from "@/lib/password-confirm";
import { buildExportZip } from "@/lib/billing-export";
import { isExportDatasetKey } from "@/lib/export-datasets";

// Mit mehreren Dokument-Dateien kann das Zusammenstellen laenger dauern.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Daten-Export bei gesperrtem Zugang: nur fuer Admins der gesperrten Firma und
// nur nach erneuter Passwort-Bestaetigung. Bewusst eigene Route statt der
// normalen Einstellungen-Export-Route, weil diese hier in einem Zustand
// erreichbar sein muss, in dem das Dashboard selbst gesperrt ist.
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    password?: string;
    datasets?: string[];
    includeFiles?: boolean;
  } | null;
  if (!body) return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { role: true },
  });
  if (!user || user.role?.name !== "Admin") {
    return NextResponse.json({ error: "Nur für Admins verfügbar." }, { status: 403 });
  }

  const company = await prisma.company.findUnique({ where: { id: user.companyId } });
  if (!company || !isBillingBlocked(company)) {
    return NextResponse.json({ error: "Der Zugang ist nicht gesperrt." }, { status: 403 });
  }

  const datasets = Array.from(new Set((body.datasets ?? []).filter(isExportDatasetKey)));
  if (datasets.length === 0) {
    return NextResponse.json({ error: "Bitte mindestens einen Datenbereich auswählen." }, { status: 400 });
  }

  const confirmed = await confirmPassword(user.id, body.password ?? "");
  if (!confirmed.ok) {
    return NextResponse.json({ error: confirmed.error }, { status: 401 });
  }

  const result = await buildExportZip(company.id, datasets, body.includeFiles === true);

  return new NextResponse(new Uint8Array(result.zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
