"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export type ColumnConfig = {
  key: string;
  visible: boolean;
  order: number;
  width: number; // px
};

export type ListViewConfig = {
  viewMode: "cards" | "table";
  columns: ColumnConfig[];
};

// Gespeichert als { [entity]: ListViewConfig } im navConfig-artigen JSON-Feld
// auf dem User -- gilt nur fuer den jeweiligen Nutzer, nicht firmenweit.
export async function getListViewConfig(entity: string): Promise<ListViewConfig | null> {
  const user = await getCurrentUser();
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { listViewConfig: true },
  });
  const all = dbUser?.listViewConfig as Record<string, ListViewConfig> | null;
  return all?.[entity] ?? null;
}

export async function saveListViewConfig(entity: string, config: ListViewConfig) {
  const user = await getCurrentUser();
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { listViewConfig: true },
  });
  const all = (dbUser?.listViewConfig as Record<string, ListViewConfig> | null) ?? {};
  await prisma.user.update({
    where: { id: user.id },
    data: { listViewConfig: { ...all, [entity]: config } },
  });
  revalidatePath("/", "layout");
}
