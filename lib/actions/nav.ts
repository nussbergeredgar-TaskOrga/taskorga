"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import type { NavItemConfig } from "@/lib/nav-items";

export async function getNavConfig(): Promise<NavItemConfig[] | null> {
  const user = await getCurrentUser();
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { navConfig: true },
  });
  const config = dbUser?.navConfig as { items?: NavItemConfig[] } | null;
  return config?.items ?? null;
}

export async function saveNavConfig(items: NavItemConfig[]) {
  const user = await getCurrentUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { navConfig: { items } },
  });
  revalidatePath("/", "layout");
}
