import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { buildInvoiceEInvoice } from "@/lib/invoice-einvoice";

// E-Rechnung (XRechnung 3.0, XML) zu einer Rechnung herunterladen. Fehlen
// Pflichtangaben, kommt statt der Datei eine verstaendliche Fehlerseite.
export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const result = await buildInvoiceEInvoice(params.id, session.user.companyId);
  if (!result.found) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }
  if (!result.xml) {
    return NextResponse.json(
      {
        error: "Die E-Rechnung kann noch nicht erzeugt werden.",
        fehlendeAngaben: result.problems,
      },
      { status: 422 }
    );
  }

  return new NextResponse(result.xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
