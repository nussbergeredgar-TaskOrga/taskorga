"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export type FilterCondition = {
  field: string;
  values: string[];
};

export type SavedFilter = {
  id: string;
  name: string;
  conditions: FilterCondition[];
};

export type FilterEntityState = {
  filters: SavedFilter[];
  activeFilterId: string | null;
};

export type FilterFieldDef = {
  key: string;
  label: string;
  options: { value: string; label: string }[];
};

const EMPTY_STATE: FilterEntityState = { filters: [], activeFilterId: null };

async function loadAll(userId: string): Promise<Record<string, FilterEntityState>> {
  const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { savedFilters: true } });
  return (dbUser?.savedFilters as Record<string, FilterEntityState> | null) ?? {};
}

// Gespeichert als { [entity]: FilterEntityState } im selben Muster wie
// listViewConfig -- gilt nur fuer den jeweiligen Nutzer, nicht firmenweit.
export async function getFilterState(entity: string): Promise<FilterEntityState> {
  const user = await getCurrentUser();
  const all = await loadAll(user.id);
  return all[entity] ?? EMPTY_STATE;
}

// Legt einen neuen benannten Filter an (ohne id) oder aktualisiert einen
// bestehenden (mit id). Der gespeicherte/aktualisierte Filter wird jeweils
// sofort aktiv, da er gerade bewusst ausgewaehlt bzw. bearbeitet wurde.
export async function saveFilter(
  entity: string,
  filter: { id?: string; name: string; conditions: FilterCondition[] }
): Promise<SavedFilter> {
  const user = await getCurrentUser();
  const all = await loadAll(user.id);
  const state = all[entity] ?? { filters: [], activeFilterId: null };

  const saved: SavedFilter = {
    id: filter.id ?? randomUUID(),
    name: filter.name.trim() || "Ohne Namen",
    conditions: filter.conditions,
  };
  const exists = state.filters.some((f) => f.id === saved.id);
  const nextFilters = exists ? state.filters.map((f) => (f.id === saved.id ? saved : f)) : [...state.filters, saved];

  await prisma.user.update({
    where: { id: user.id },
    data: { savedFilters: { ...all, [entity]: { filters: nextFilters, activeFilterId: saved.id } } },
  });
  revalidatePath("/", "layout");
  return saved;
}

export async function deleteFilter(entity: string, filterId: string): Promise<void> {
  const user = await getCurrentUser();
  const all = await loadAll(user.id);
  const state = all[entity] ?? { filters: [], activeFilterId: null };
  const nextFilters = state.filters.filter((f) => f.id !== filterId);
  const nextActive = state.activeFilterId === filterId ? null : state.activeFilterId;

  await prisma.user.update({
    where: { id: user.id },
    data: { savedFilters: { ...all, [entity]: { filters: nextFilters, activeFilterId: nextActive } } },
  });
  revalidatePath("/", "layout");
}

export async function setActiveFilter(entity: string, filterId: string | null): Promise<void> {
  const user = await getCurrentUser();
  const all = await loadAll(user.id);
  const state = all[entity] ?? { filters: [], activeFilterId: null };

  await prisma.user.update({
    where: { id: user.id },
    data: { savedFilters: { ...all, [entity]: { filters: state.filters, activeFilterId: filterId } } },
  });
  revalidatePath("/", "layout");
}
