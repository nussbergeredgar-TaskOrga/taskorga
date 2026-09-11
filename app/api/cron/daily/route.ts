import { NextResponse } from "next/server";
import { startOfDay, endOfDay, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { sendTaskOverdueEmail, sendAccountDeletedEmail } from "@/lib/email";
import { sendPushToUser } from "@/lib/push";
import { deleteCompanyData } from "@/lib/company-deletion";

// Von Vercel Cron einmal taeglich aufgerufen (vercel.json), kein eingeloggter
// Nutzer -- Absicherung wie bei app/api/webhooks/stripe/route.ts, nur per
// Secret statt Signatur: Vercel schickt bei gesetztem CRON_SECRET automatisch
// "Authorization: Bearer <CRON_SECRET>" mit (Vercels eigener, dokumentierter
// Mechanismus fuer Cron-Routen).
//
// Vier voneinander unabhaengige taegliche Aufgaben in einer Route, weil
// Vercels Hobby-Plan nur einen Cron-Zeitplan erlaubt (siehe Kontext der
// zugehoerigen Planungsrunde) -- Aufgaben-Eskalation, Termin-Zusammenfassung,
// die automatische Loeschung gekuendigter Konten und das Aufraeumen alter
// Registrierungs-Versuche teilen sich deshalb denselben taeglichen Lauf.
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const [taskEscalations, dailyAppointments, canceledCompanyDeletions, signupAttemptCleanup] = await Promise.all([
    runTaskEscalations(),
    runDailyAppointments(),
    runCanceledCompanyDeletions(),
    runSignupAttemptCleanup(),
  ]);

  return NextResponse.json({ taskEscalations, dailyAppointments, canceledCompanyDeletions, signupAttemptCleanup });
}

// -----------------------------------------------------------------------
// Ueberfaellige Aufgaben -- Eskalationsstufen, siehe TaskEscalationLevel
// (lib/actions/task-escalation-levels.ts, Einstellungen -> Firma).
// -----------------------------------------------------------------------
async function runTaskEscalations() {
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
    return { processed: 0, sent: 0 };
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
        await sendPushToUser(
          task.assigneeId!,
          { title: `Überfällige Aufgabe (${level.label})`, body: task.title, url: taskUrl },
          "taskOverdue"
        );
      } catch (err) {
        console.error(`Ueberfaellig-Push fuer Aufgabe ${task.id} fehlgeschlagen:`, err);
      }
    }
  }

  return { processed: overdueTasks.length, sent };
}

// -----------------------------------------------------------------------
// Heutige Termine -- Opt-in-Zusammenfassungs-Push (User.pushDailyAppointments),
// nur Push, keine E-Mail. Ein Nutzer ohne Termine heute bekommt keine Push
// (kein "0 Termine"-Spam), sendPushToUser() prueft die Kategorie zusaetzlich
// nochmal serverseitig ab.
// -----------------------------------------------------------------------
async function runDailyAppointments() {
  const now = new Date();
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  const users = await prisma.user.findMany({
    where: { pushDailyAppointments: true, pushSubscriptions: { some: {} } },
    select: { id: true },
  });

  let sent = 0;
  for (const user of users) {
    const appointments = await prisma.appointment.findMany({
      where: {
        assigneeId: user.id,
        status: "SCHEDULED",
        scheduledAt: { gte: startOfDay(now), lte: endOfDay(now) },
      },
      include: { customer: { select: { name: true } } },
      orderBy: { scheduledAt: "asc" },
    });
    if (appointments.length === 0) continue;

    const items = appointments.slice(0, 3).map((a) => {
      const time = a.scheduledAt!.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
      return `${time} ${a.customer?.name ?? a.title}`;
    });
    const rest = appointments.length - items.length;
    const body = items.join(", ") + (rest > 0 ? `, + ${rest} weitere` : "");

    try {
      await sendPushToUser(
        user.id,
        { title: "Heutige Termine", body, url: `${baseUrl}/termine` },
        "dailyAppointments"
      );
      sent++;
    } catch (err) {
      console.error(`Termin-Erinnerung fuer Nutzer ${user.id} fehlgeschlagen:`, err);
    }
  }

  return { processed: users.length, sent };
}

// -----------------------------------------------------------------------
// Automatische Loeschung gekuendigter Konten -- AGB Ziffer 7: Daten bleiben
// nach Vertragsende mindestens 30 Tage zum Export verfuegbar, danach darf
// geloescht werden. canceledAt wird beim Stripe-Webhook
// "customer.subscription.deleted" gesetzt (app/api/webhooks/stripe/route.ts).
// billingExempt/isPlatformOwner sind bewusst doppelt abgesichert (auch wenn
// solche Firmen ueblicherweise ohnehin kein canceledAt bekommen), da dies ein
// unwiderruflicher, destruktiver Vorgang ist.
// -----------------------------------------------------------------------
async function runCanceledCompanyDeletions() {
  const cutoff = subDays(new Date(), 30);

  const companies = await prisma.company.findMany({
    where: {
      subscriptionStatus: "CANCELED",
      canceledAt: { lte: cutoff },
      billingExempt: false,
      isPlatformOwner: false,
    },
    select: { id: true, name: true, email: true },
  });

  let deleted = 0;
  for (const company of companies) {
    try {
      const admins = await prisma.user.findMany({
        where: { companyId: company.id, role: { name: "Admin" } },
        select: { email: true },
      });
      const recipients = admins.length > 0 ? admins.map((a) => a.email) : company.email ? [company.email] : [];

      await deleteCompanyData(company.id);
      deleted++;

      for (const to of recipients) {
        try {
          await sendAccountDeletedEmail({ to, companyName: company.name });
        } catch (err) {
          console.error(`Loesch-Bestaetigung fuer Firma ${company.id} fehlgeschlagen:`, err);
        }
      }
    } catch (err) {
      console.error(`Automatische Loeschung fuer Firma ${company.id} fehlgeschlagen:`, err);
    }
  }

  return { processed: companies.length, deleted };
}

// -----------------------------------------------------------------------
// Aufraeumen alter Registrierungs-Versuche -- SignupAttempt speichert die
// IP-Adresse jedes fehlgeschlagenen Registrierungsversuchs zur
// Missbrauchserkennung (lib/actions/signup.ts, MAX_SIGNUP_ATTEMPTS_PER_HOUR).
// Gebraucht wird davon nur ein rollierendes 1-Stunden-Fenster -- alles
// aeltere als 24h (grosszuegige Sicherheitsmarge) ist fuer den eigentlichen
// Zweck wertlos und wird aus Datensparsamkeit (Art. 5 Abs. 1 lit. e DSGVO)
// geloescht, siehe Datenschutzerklaerung.
// -----------------------------------------------------------------------
async function runSignupAttemptCleanup() {
  const { count } = await prisma.signupAttempt.deleteMany({
    where: { createdAt: { lt: subDays(new Date(), 1) } },
  });
  return { deleted: count };
}
