"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser, getCurrentCompany } from "@/lib/session";
import { sendTaskAssignedEmail } from "@/lib/email";
import { sendPushToUser } from "@/lib/push";
import { NAV_CATALOG } from "@/lib/nav-items";

export type SupportAttachment = { fileName: string; fileUrl: string; mimeType: string; fileSize: number };

// Erzeugt aus einem Support-Ticket direkt eine Aufgabe beim Plattform-Betreiber
// (Company.isPlatformOwner) -- derselbe Grundmechanismus wie bei
// requestUpdate() in lib/actions/update-request.ts (Firma+Admin-Nutzer
// ermitteln, Aufgabe dort anlegen), nur mit Kommentar + Screenshots statt
// eines einzelnen Buttons. Das faellige Datum liegt bewusst 30h in der
// Vergangenheit (nicht nur 24h), damit die taegliche Eskalations-Pruefung
// (app/api/cron/daily) das Ticket unabhaengig von der Tageszeit zuverlaessig
// als mindestens 1 Tag ueberfaellig erkennt -- Edgar soll es sofort als
// dringend markiert sehen, nicht erst nach einem vollen weiteren Tag.
export async function submitSupportTicket(data: {
  area: string;
  comment: string;
  attachments: SupportAttachment[];
}): Promise<{ error?: string; success?: boolean }> {
  const comment = data.comment.trim();
  if (!comment) return { error: "Bitte kurz beschreiben, worum es geht." };

  const user = await getCurrentUser();
  const company = await getCurrentCompany();

  const platformOwner = await prisma.company.findFirst({ where: { isPlatformOwner: true } });
  if (!platformOwner) return { error: "Support ist aktuell nicht erreichbar." };

  const assignee = await prisma.user.findFirst({
    where: { companyId: platformOwner.id, role: { name: "Admin" } },
    select: { id: true, name: true, email: true },
  });

  const areaLabel = NAV_CATALOG.find((n) => n.id === data.area)?.label ?? data.area;
  const dueDate = new Date(Date.now() - 30 * 60 * 60 * 1000);

  const task = await prisma.task.create({
    data: {
      companyId: platformOwner.id,
      title: `Support: ${areaLabel} – ${company.name}`,
      description: `Gemeldet von ${user.name ?? "unbekannt"} (${user.email ?? "keine E-Mail"}) bei „${company.name}".\n\n${comment}`,
      dueDate,
      assigneeId: assignee?.id ?? null,
    },
  });

  if (data.attachments.length > 0) {
    await prisma.document.createMany({
      data: data.attachments.map((a) => ({
        companyId: platformOwner.id,
        taskId: task.id,
        fileName: a.fileName,
        fileUrl: a.fileUrl,
        mimeType: a.mimeType,
        fileSize: a.fileSize,
      })),
    });
  }

  if (assignee) {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const taskUrl = `${baseUrl}/aufgaben/${task.id}`;

    // Getrennte try/catch je Kanal, gleiches Muster wie notifyTaskAssigned in
    // lib/actions/free-tasks.ts -- ein Mail-Fehler soll den Push-Versand nicht
    // mitverhindern und die Ticket-Erstellung selbst nie scheitern lassen.
    try {
      await sendTaskAssignedEmail({
        to: assignee.email,
        assigneeName: assignee.name,
        taskTitle: task.title,
        creatorName: `${user.name ?? company.name} (Support-Ticket)`,
        taskUrl,
      });
    } catch (err) {
      console.error("Support-Ticket-Mail konnte nicht verschickt werden:", err);
    }
    try {
      await sendPushToUser(assignee.id, { title: "Neues Support-Ticket", body: task.title, url: taskUrl }, "taskAssigned");
    } catch (err) {
      console.error("Support-Ticket-Push konnte nicht verschickt werden:", err);
    }
  }

  return { success: true };
}
