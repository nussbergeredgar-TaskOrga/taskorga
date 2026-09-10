import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTaskOverdueEmail } from "@/lib/email";
import { sendPushToUser } from "@/lib/push";

// Von Vercel Cron einmal taeglich aufgerufen (vercel.json), kein eingeloggter
// Nutzer -- Absicherung wie bei app/api/webhooks/stripe/route.ts, nur per
// Secret statt Signatur: Vercel schickt bei gesetztem CRON_SECRET automatisch
// "Authorization: Bearer <CRON_SECRET>" mit (Vercels eigener, dokumentierter
// Mechanismus fuer Cron-Routen).
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const now = new Date();
  const overdueTasks = await prisma.task.findMany({
    where: {
      status: { in: ["OPEN", "IN_PROGRESS"] },
      dueDate: { lt: now },
      assigneeId: { not: null },
    },
    include: { assignee: { select: { name: true, email: true } } },
  });

  if (overdueTasks.length === 0) {
    return NextResponse.json({ processed: 0, sent: 0 });
  }

  const companyIds = Array.from(new Set(overdueTasks.map((t) => t.companyId)));
  const levelsByCompany = new Map(
    await Promise.all(
      companyIds.map(async (companyId) => {
        const levels = await prisma.taskEscalationLevel.findMany({
          where: { companyId },
          orderBy: { daysOverdue: "desc" },
        });
        return [companyId, levels] as const;
      })
    )
  );

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  let sent = 0;

  for (const task of overdueTasks) {
    if (!task.dueDate || !task.assignee) continue;
    const levels = levelsByCompany.get(task.companyId) ?? [];
    const daysOverdue = Math.floor((now.getTime() - task.dueDate.getTime()) / (24 * 60 * 60 * 1000));
    // Levels sind nach daysOverdue absteigend sortiert -- der erste Treffer
    // ist die hoechste bereits erreichte Stufe, unabhaengig davon, ob order
    // zahlenmaessig mit daysOverdue uebereinstimmt.
    const level = levels.find((l) => l.daysOverdue <= daysOverdue);
    if (!level || level.order <= task.escalationLevelSent) continue;

    const taskUrl = `${baseUrl}/aufgaben/${task.id}`;
    const dueDateLabel = task.dueDate.toLocaleDateString("de-DE");
    const recipients: { to: string; name?: string }[] = [];
    if (level.notifyAssignee) recipients.push({ to: task.assignee.email, name: task.assignee.name });
    for (const extra of level.extraRecipients) recipients.push({ to: extra });

    try {
      for (const recipient of recipients) {
        await sendTaskOverdueEmail({
          to: recipient.to,
          recipientName: recipient.name,
          taskTitle: task.title,
          dueDate: dueDateLabel,
          daysOverdue,
          levelLabel: level.label,
          taskUrl,
        });
        sent++;
      }
      await prisma.task.update({ where: { id: task.id }, data: { escalationLevelSent: level.order } });
    } catch (err) {
      console.error(`Ueberfaellig-Mail fuer Aufgabe ${task.id} fehlgeschlagen:`, err);
    }

    // Push nur an den Zustaendigen (nicht an extraRecipients -- das sind evtl.
    // keine TaskOrga-Nutzer und haben daher kein Push-Abo). Eigener try/catch,
    // damit ein Push-Fehler den obigen Mail-Versand/escalationLevelSent nicht beeinflusst.
    if (level.notifyAssignee) {
      try {
        await sendPushToUser(task.assigneeId!, {
          title: `Überfällige Aufgabe (${level.label})`,
          body: task.title,
          url: taskUrl,
        });
      } catch (err) {
        console.error(`Ueberfaellig-Push fuer Aufgabe ${task.id} fehlgeschlagen:`, err);
      }
    }
  }

  return NextResponse.json({ processed: overdueTasks.length, sent });
}
