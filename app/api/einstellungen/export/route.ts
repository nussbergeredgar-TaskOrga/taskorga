import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DSGVO-Datenexport: liefert alle Daten der Firma als JSON-Datei zum Download.
// Nur für Admins zugänglich. Passwort-Hashes und Sicherheitsfelder werden
// bewusst nicht mit exportiert.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { role: true },
  });
  if (dbUser?.role?.name !== "Admin") {
    return NextResponse.json({ error: "Nur für Admins verfügbar." }, { status: 403 });
  }

  const companyId = session.user.companyId;

  const [
    company,
    users,
    customers,
    inquiries,
    quotes,
    projects,
    invoices,
    expenses,
    tasks,
    appointments,
    documents,
    activities,
  ] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId } }),
    prisma.user.findMany({
      where: { companyId },
      select: { id: true, email: true, name: true, createdAt: true, role: { select: { name: true } } },
    }),
    prisma.customer.findMany({ where: { companyId }, include: { contacts: true } }),
    prisma.inquiry.findMany({ where: { companyId } }),
    prisma.quote.findMany({ where: { companyId }, include: { items: true } }),
    prisma.project.findMany({ where: { companyId } }),
    prisma.invoice.findMany({ where: { companyId }, include: { items: true } }),
    prisma.expense.findMany({ where: { companyId } }),
    prisma.task.findMany({ where: { companyId } }),
    prisma.appointment.findMany({ where: { companyId } }),
    prisma.document.findMany({
      where: { companyId },
      select: { id: true, fileName: true, fileUrl: true, mimeType: true, fileSize: true, createdAt: true },
    }),
    prisma.activity.findMany({ where: { companyId } }),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    company,
    users,
    customers,
    inquiries,
    quotes,
    projects,
    invoices,
    expenses,
    tasks,
    appointments,
    documents,
    activities,
  };

  const json = JSON.stringify(exportData, (_key, value) => (typeof value === "bigint" ? value.toString() : value), 2);
  const filename = `taskorga-export-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
