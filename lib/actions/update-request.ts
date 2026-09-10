"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, getCurrentCompany } from "@/lib/session";
import { sendUpdateRequestEmail } from "@/lib/email";

// "Update anfordern" im Glocken-Dropdown (components/top-bar.tsx) -- nur für
// Admins der jeweiligen Firma (requireAdmin()). Benachrichtigt Edgar per Mail
// UND legt eine Aufgabe in seiner eigenen internen Firma an (markiert per
// Company.isPlatformOwner, siehe Setup-Skript), damit er sie wie gewohnt
// bearbeiten und ein Angebot daraus erstellen kann.
export async function requestUpdate() {
  const admin = await requireAdmin();
  const company = await getCurrentCompany();

  // Mehrfach-Anfragen/Spam-Klicks verhindern -- clientseitig zeigt der Button
  // danach ohnehin "Anfrage gesendet", das hier ist nur die serverseitige
  // Absicherung.
  if (company.updateRequestedAt) return;

  await sendUpdateRequestEmail({
    companyName: company.name,
    requesterName: admin.name,
    requesterEmail: admin.email,
  });

  const platformOwner = await prisma.company.findFirst({ where: { isPlatformOwner: true } });
  if (platformOwner) {
    const assignee = await prisma.user.findFirst({
      where: { companyId: platformOwner.id, role: { name: "Admin" } },
    });
    await prisma.task.create({
      data: {
        companyId: platformOwner.id,
        title: `Update-Anfrage: ${company.name}`,
        description: `${admin.name} (${admin.email}) hat für „${company.name}" ein Update angefragt.`,
        assigneeId: assignee?.id,
      },
    });
  }

  await prisma.company.update({ where: { id: company.id }, data: { updateRequestedAt: new Date() } });
  revalidatePath("/", "layout");
}
