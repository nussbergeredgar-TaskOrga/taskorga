import Link from "next/link";
import { Clock, TrendingDown, Radar } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { MS_PER_DAY } from "@/lib/date-utils";

const INACTIVE_DAYS_THRESHOLD = 90;

export default async function KundenRadarPage() {
  const company = await getCurrentCompany();

  const customers = await prisma.customer.findMany({
    where: { companyId: company.id },
    select: {
      id: true,
      name: true,
      customerSince: true,
      appointments: { select: { scheduledAt: true } },
      activities: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
    },
    orderBy: { name: "asc" },
  });

  const now = new Date();
  const currentYear = now.getFullYear();
  const lastYear = currentYear - 1;
  // Für einen fairen Vergleich zählen wir im Vorjahr nur den Zeitraum bis zum
  // heutigen Kalendertag — sonst wirkt unterjährig (z. B. im März) fast jeder
  // Kunde fälschlich rückläufig, weil ein volles Vorjahr mit einem erst
  // angefangenen aktuellen Jahr verglichen wird.
  const lastYearComparableEnd = new Date(lastYear, now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const inactive: { id: string; name: string; daysSince: number }[] = [];
  const decliningFrequency: { id: string; name: string; thisYear: number; lastYear: number }[] = [];

  for (const c of customers) {
    // Letzter Kontakt: neuste Aktivität ODER neuster Termin, je nachdem was später ist
    const lastActivity = c.activities[0]?.createdAt;
    const lastAppointment = c.appointments
      .map((a) => a.scheduledAt)
      .filter((d): d is Date => d != null)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    const lastContact =
      lastActivity && lastAppointment
        ? lastActivity > lastAppointment
          ? lastActivity
          : lastAppointment
        : lastActivity || lastAppointment;

    if (lastContact) {
      const daysSince = Math.floor((now.getTime() - lastContact.getTime()) / MS_PER_DAY);
      if (daysSince >= INACTIVE_DAYS_THRESHOLD) {
        inactive.push({ id: c.id, name: c.name, daysSince });
      }
    }

    // Terminfrequenz: dieses Jahr vs. letztes Jahr
    const thisYearCount = c.appointments.filter(
      (a) => a.scheduledAt && a.scheduledAt.getFullYear() === currentYear
    ).length;
    const lastYearCount = c.appointments.filter(
      (a) => a.scheduledAt && a.scheduledAt.getFullYear() === lastYear
    ).length;
    const lastYearCountComparable = c.appointments.filter(
      (a) => a.scheduledAt && a.scheduledAt.getFullYear() === lastYear && a.scheduledAt <= lastYearComparableEnd
    ).length;

    if (lastYearCountComparable >= 2 && thisYearCount < lastYearCountComparable) {
      decliningFrequency.push({ id: c.id, name: c.name, thisYear: thisYearCount, lastYear: lastYearCount });
    }
  }

  inactive.sort((a, b) => b.daysSince - a.daysSince);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Radar size={22} className="text-brand-500" />
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Kunden-Radar</h1>
          <p className="text-sm text-ink-500 mt-1">
            Automatisch erkannte Signale aus deinen Kundendaten — für Cross-Selling und Nachfassen.
          </p>
        </div>
      </div>

      <div className="rounded-card border border-ink-100 bg-surface p-5 shadow-card">
        <div className="flex items-center gap-2 mb-1">
          <Clock size={16} className="text-warning" />
          <h2 className="font-display font-semibold text-ink-900">
            Lange kein Kontakt (ab {INACTIVE_DAYS_THRESHOLD} Tagen)
          </h2>
        </div>
        <p className="text-sm text-ink-500 mb-4">
          Kein Termin und keine Aktivität seit mindestens {INACTIVE_DAYS_THRESHOLD} Tagen.
        </p>
        {inactive.length === 0 ? (
          <p className="text-sm text-ink-300">Keine Kunden — alle wurden kürzlich kontaktiert. 🎉</p>
        ) : (
          <div className="space-y-2">
            {inactive.map((c) => (
              <Link
                key={c.id}
                href={`/kunden/${c.id}`}
                className="flex items-center justify-between rounded-lg border-l-4 border-l-warning bg-ink-50 hover:bg-ink-100 px-3 py-2.5 text-sm transition-colors"
              >
                <span className="font-medium text-ink-900">{c.name}</span>
                <span className="font-mono text-xs text-ink-500">{c.daysSince} Tage kein Kontakt</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-card border border-ink-100 bg-surface p-5 shadow-card">
        <div className="flex items-center gap-2 mb-1">
          <TrendingDown size={16} className="text-danger" />
          <h2 className="font-display font-semibold text-ink-900">Rückläufige Terminfrequenz</h2>
        </div>
        <p className="text-sm text-ink-500 mb-4">
          Kunden, die letztes Jahr mehrere Termine hatten, dieses Jahr aber weniger — mögliche
          Gelegenheit zum Nachfassen.
        </p>
        {decliningFrequency.length === 0 ? (
          <p className="text-sm text-ink-300">Keine auffälligen Kunden.</p>
        ) : (
          <div className="space-y-2">
            {decliningFrequency.map((c) => (
              <Link
                key={c.id}
                href={`/kunden/${c.id}`}
                className="flex items-center justify-between rounded-lg border-l-4 border-l-danger bg-ink-50 hover:bg-ink-100 px-3 py-2.5 text-sm transition-colors"
              >
                <span className="font-medium text-ink-900">{c.name}</span>
                <span className="font-mono text-xs text-ink-500">
                  {lastYear}: {c.lastYear} · {currentYear}: {c.thisYear}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
