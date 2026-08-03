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

  const newUser = await prisma.user.create({
    data: {
      companyId: admin.companyId,
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      roleId: role?.id,
    },
  });

  await prisma.activity.create({
    data: {
      companyId: admin.companyId,
      userId: admin.id,
      type: "team.user_created",
      message: `Teammitglied „${newUser.name}“ (${newUser.email}) wurde als ${parsed.data.roleName} angelegt.`,
    },
  });

  revalidatePath("/einstellungen");
  return { success: true };
}

export async function updateUserRole(userId: string, roleName: "Admin" | "Mitarbeiter") {
  const admin = await requireAdmin();

  const target = await prisma.user.findFirst({ where: { id: userId, companyId: admin.companyId } });
  if (!target) return { error: "Nutzer nicht gefunden." };

  // Verhindern, dass der letzte Admin sich selbst degradiert und die Firma ohne Admin dasteht
  if (userId === admin.id && roleName !== "Admin") {
    const adminCount = await prisma.user.count({
      where: { companyId: admin.companyId, role: { name: "Admin" } },
    });
    if (adminCount <= 1) return { error: "Du bist der letzte Admin und kannst dich nicht selbst degradieren." };
  }

  const role = await prisma.role.findFirst({ where: { companyId: admin.companyId, name: roleName } });
  await prisma.user.updateMany({ where: { id: userId, companyId: admin.companyId }, data: { roleId: role?.id } });

  await prisma.activity.create({
    data: {
      companyId: admin.companyId,
      userId: admin.id,
      type: "team.role_changed",
      message: `Rolle von „${target.name}“ wurde auf ${roleName} geändert.`,
    },
  });

  revalidatePath("/einstellungen");
}

export async function deleteUser(userId: string) {
  const admin = await requireAdmin();
  if (userId === admin.id) return { error: "Du kannst dich nicht selbst entfernen." };

  const target = await prisma.user.findFirst({ where: { id: userId, companyId: admin.companyId } });
  if (!target) return { error: "Nutzer nicht gefunden." };

  await prisma.user.deleteMany({ where: { id: userId, companyId: admin.companyId } });

  await prisma.activity.create({
    data: {
      companyId: admin.companyId,
      userId: admin.id,
      type: "team.user_deleted",
      message: `Teammitglied „${target.name}“ (${target.email}) wurde entfernt.`,
    },
  });

  revalidatePath("/einstellungen");
}

export async function resetUserPassword(userId: string, newPassword: string) {
  const admin = await requireAdmin();

  if (newPassword.length < 8) {
    return { error: "Passwort muss mindestens 8 Zeichen haben." };
  }

  const target = await prisma.user.findFirst({ where: { id: userId, companyId: admin.companyId } });
  if (!target) return { error: "Nutzer nicht gefunden." };

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.updateMany({ where: { id: userId, companyId: admin.companyId }, data: { passwordHash } });

  await prisma.activity.create({
    data: {
      companyId: admin.companyId,
      userId: admin.id,
      type: "team.password_reset",
      message: `Passwort von „${target.name}“ wurde zurückgesetzt.`,
    },
  });

  revalidatePath("/einstellungen");
  return { success: true };
}
