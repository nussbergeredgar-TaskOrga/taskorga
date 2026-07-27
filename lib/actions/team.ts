"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export type CreateUserState = { error?: string; success?: boolean };

const createUserSchema = z.object({
  name: z.string().min(2, "Name muss mindestens 2 Zeichen haben"),
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen haben"),
  roleName: z.enum(["Admin", "Mitarbeiter"]),
});

export async function createUser(
  _prev: CreateUserState,
  formData: FormData
): Promise<CreateUserState> {
  const admin = await requireAdmin();

  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    roleName: formData.get("roleName"),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Ungültige Eingabe." };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { error: "Diese E-Mail-Adresse wird bereits verwendet." };
  }

  const role = await prisma.role.findFirst({
    where: { companyId: admin.companyId, name: parsed.data.roleName },
  });

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await prisma.user.create({
    data: {
      companyId: admin.companyId,
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      roleId: role?.id,
    },
  });

  revalidatePath("/einstellungen");
  return { success: true };
}

export async function updateUserRole(userId: string, roleName: "Admin" | "Mitarbeiter") {
  const admin = await requireAdmin();

  // Verhindern, dass der letzte Admin sich selbst degradiert und die Firma ohne Admin dasteht
  if (userId === admin.id && roleName !== "Admin") {
    const adminCount = await prisma.user.count({
      where: { companyId: admin.companyId, role: { name: "Admin" } },
    });
    if (adminCount <= 1) return { error: "Du bist der letzte Admin und kannst dich nicht selbst degradieren." };
  }

  const role = await prisma.role.findFirst({ where: { companyId: admin.companyId, name: roleName } });
  await prisma.user.update({ where: { id: userId }, data: { roleId: role?.id } });
  revalidatePath("/einstellungen");
}

export async function deleteUser(userId: string) {
  const admin = await requireAdmin();
  if (userId === admin.id) return { error: "Du kannst dich nicht selbst entfernen." };
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/einstellungen");
}

export async function resetUserPassword(userId: string, newPassword: string) {
  await requireAdmin();

  if (newPassword.length < 8) {
    return { error: "Passwort muss mindestens 8 Zeichen haben." };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  revalidatePath("/einstellungen");
  return { success: true };
}
