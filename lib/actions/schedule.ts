"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany, requireAdmin, getCurrentUser } from "@/lib/session";

const WEEKDAY_DEFAULTS = [0, 1, 2, 3, 4].map((weekday) => ({
  weekday,
  startTime: "08:00",
  endTime: "17:00",
  isWorkingDay: true,
}));
const WEEKEND_DEFAULTS = [5, 6].map((weekday) => ({
  weekday,
  startTime: "08:00",
  endTime: "17:00",
  isWorkingDay: false,
}));

export async function getWorkingHours(userId: string) {
  const rows = await prisma.userWorkingHours.findMany({ where: { userId }, orderBy: { weekday: "asc" } });
  if (rows.length === 7) return rows;

  const defaults = [...WEEKDAY_DEFAULTS, ...WEEKEND_DEFAULTS];
  const byWeekday = new Map(rows.map((r) => [r.weekday, r]));
  return defaults.map((d) => byWeekday.get(d.weekday) ?? { id: `default-${d.weekday}`, userId, ...d });
}

export async function saveWorkingHours(
  userId: string,
  hours: { weekday: number; startTime: string; endTime: string; isWorkingDay: boolean }[]
) {
  const admin = await requireAdmin();
  const target = await prisma.user.findFirst({ where: { id: userId, companyId: admin.companyId } });
  if (!target) return;

  await Promise.all(
    hours.map((h) =>
      prisma.userWorkingHours.upsert({
        where: { userId_weekday: { userId, weekday: h.weekday } },
        create: { userId, ...h },
        update: h,
      })
    )
  );

  revalidatePath("/einstellungen/firma");
  revalidatePath("/termine");
}

export async function getAllUsersWorkingHours(companyId: string) {
  const users = await prisma.user.findMany({ where: { companyId }, select: { id: true } });
  const all = await Promise.all(users.map((u) => getWorkingHours(u.id)));
  const map: Record<string, Awaited<ReturnType<typeof getWorkingHours>>> = {};
  users.forEach((u, i) => {
    map[u.id] = all[i];
  });
  return map;
}

export async function getAbsences() {
  const company = await getCurrentCompany();
  return prisma.absence.findMany({
    where: { companyId: company.id },
    orderBy: { startDate: "asc" },
    include: { user: { select: { name: true } } },
  });
}

export async function createAbsence(data: {
  userId?: string; // leer = Feiertag (firmenweit)
  type: "URLAUB" | "FREI" | "FEIERTAG";
  startDate: string;
  endDate: string;
  note?: string;
}) {
  const admin = await requireAdmin();
  if (!data.startDate || !data.endDate) return;

  await prisma.absence.create({
    data: {
      companyId: admin.companyId,
      userId: data.type === "FEIERTAG" ? null : data.userId || null,
      type: data.type,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      note: data.note || null,
    },
  });

  revalidatePath("/einstellungen/firma");
  revalidatePath("/termine");
}

export async function deleteAbsence(id: string) {
  const admin = await requireAdmin();
  await prisma.absence.deleteMany({ where: { id, companyId: admin.companyId } });
  revalidatePath("/einstellungen/firma");
  revalidatePath("/termine");
}

// Für die Kalenderansicht: eigene Arbeitszeiten + eigene Abwesenheiten + Feiertage
export async function getCalendarScheduleContext() {
  const user = await getCurrentUser();
  const company = await getCurrentCompany();

  const [workingHours, absences] = await Promise.all([
    getWorkingHours(user.id),
    prisma.absence.findMany({
      where: { companyId: company.id, OR: [{ userId: user.id }, { type: "FEIERTAG" }] },
    }),
  ]);

  return { workingHours, absences };
}
