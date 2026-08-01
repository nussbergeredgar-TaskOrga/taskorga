"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getCurrentCompany } from "@/lib/session";

export async function createTimeEntry(
  projectId: string,
  data: { date: string; minutes: number; description?: string }
) {
  if (!data.date || !data.minutes || data.minutes <= 0) return;
  const user = await getCurrentUser();
  const company = await getCurrentCompany();
  const project = await prisma.project.findFirst({ where: { id: projectId, companyId: company.id } });
  if (!project) return;

  await prisma.timeEntry.create({
    data: {
      projectId,
      userId: user.id,
      date: new Date(data.date),
      minutes: data.minutes,
      description: data.description?.trim() || null,
    },
  });

  revalidatePath(`/arbeit/${projectId}`);
}

export async function deleteTimeEntry(id: string, projectId: string) {
  const user = await getCurrentUser();
  // Nutzer dürfen nur ihre eigenen Einträge löschen
  await prisma.timeEntry.deleteMany({ where: { id, userId: user.id } });
  revalidatePath(`/arbeit/${projectId}`);
}
