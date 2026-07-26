"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export type ProfileState = { error?: string; success?: boolean };

export async function updateOwnName(name: string) {
  if (!name.trim()) return;
  const user = await getCurrentUser();
  await prisma.user.update({ where: { id: user.id }, data: { name: name.trim() } });
  revalidatePath("/einstellungen");
}

export async function changeOwnPassword(
  _prev: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "Bitte alle Felder ausfüllen." };
  }
  if (newPassword.length < 8) {
    return { error: "Das neue Passwort muss mindestens 8 Zeichen haben." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "Die Passwörter stimmen nicht überein." };
  }

  const user = await getCurrentUser();
  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

  const valid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
  if (!valid) {
    return { error: "Aktuelles Passwort ist falsch." };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  return { success: true };
}
