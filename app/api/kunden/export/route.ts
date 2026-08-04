import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toCsv, csvResponseHeaders } from "@/lib/csv";

const TYPE_LABELS: Record<string, string> = {
  PRIVATE: "Privatkunde",
  BUSINESS: "Geschäftskunde",
};

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const showArchived = searchParams.get("archiviert") === "1";

  const customers = await prisma.customer.findMany({
    where: {
      companyId: session.user.companyId,
      archivedAt: showArchived ? { not: null } : null,
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = [
    ["Name", "Typ", "E-Mail", "Telefon", "Adresse", "PLZ", "Ort", "Kunde seit"],
    ...customers.map((c) => [
      c.name,
      TYPE_LABELS[c.type] ?? c.type,
      c.email ?? "",
      c.phone ?? "",
      c.address ?? "",
      c.zip ?? "",
      c.city ?? "",
      c.customerSince.toLocaleDateString("de-DE"),
    ]),
  ];

  return new NextResponse(toCsv(rows), {
    headers: csvResponseHeaders(`kunden-${new Date().toISOString().slice(0, 10)}.csv`),
  });
}
