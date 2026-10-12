import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toCsv, csvNum, csvResponseHeaders } from "@/lib/csv";
import { INQUIRY_STATUS_LABELS } from "@/lib/status-labels";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const isMonthFilter = searchParams.get("range") === "month";
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const inquiries = await prisma.inquiry.findMany({
    where: {
      companyId: session.user.companyId,
      ...(isMonthFilter ? { createdAt: { gte: startOfMonth } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { customer: { select: { name: true } }, tags: { select: { name: true }, orderBy: { name: "asc" } }, },
  });

  const rows = [
    ["Titel", "Kunde", "Status", "Betrag", "Quelle", "Erstellt am", "Tags"],
    ...inquiries.map((i) => [
      i.title,
      i.customer.name,
      INQUIRY_STATUS_LABELS[i.status] ?? i.status,
      i.amount != null ? csvNum(Number(i.amount)) : "",
      i.source ?? "",
      i.createdAt.toLocaleDateString("de-DE"),
      i.tags.map((t) => t.name).join(", "),
    ]),
  ];

  return new NextResponse(toCsv(rows), {
    headers: csvResponseHeaders(`anfragen-${new Date().toISOString().slice(0, 10)}.csv`),
  });
}
