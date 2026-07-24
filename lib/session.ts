import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Liefert die Firma des eingeloggten Nutzers. Leitet zu /login um,
 * wenn niemand eingeloggt ist.
 */
export async function getCurrentCompany() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    redirect("/login");
  }

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
  });

  if (!company) {
    redirect("/login");
  }

  return company;
}

/** Liefert den eingeloggten Nutzer. Leitet zu /login um, wenn nicht eingeloggt. */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }
  return session.user;
}
