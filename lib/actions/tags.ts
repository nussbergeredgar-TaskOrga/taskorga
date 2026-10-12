"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany, requireAdmin } from "@/lib/session";
import { TAG_ENTITIES, type TagEntity, type TagItem, type TagCatalog } from "@/lib/tags";

const SETTINGS_PATH = "/einstellungen/vertrieb";
const MAX_NAME_LENGTH = 40;

type ActionResult = { error?: string };

function cleanName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH);
}

// ------------------------------------------------------------
// Lesen (fuer alle angemeldeten Nutzer: Tag-Auswahl am Datensatz)
// ------------------------------------------------------------

export async function getTagCatalog(): Promise<TagCatalog> {
  const company = await getCurrentCompany();
  const [groups, tags] = await Promise.all([
    prisma.tagGroup.findMany({ where: { companyId: company.id }, orderBy: { order: "asc" } }),
    prisma.tag.findMany({ where: { companyId: company.id }, orderBy: { name: "asc" } }),
  ]);

  return {
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      tags: tags.filter((t) => t.groupId === g.id).map((t) => ({ id: t.id, name: t.name, groupId: g.id })),
    })),
    ungrouped: tags.filter((t) => !t.groupId).map((t) => ({ id: t.id, name: t.name, groupId: null })),
  };
}

// ------------------------------------------------------------
// Verwaltung (nur Admin, Einstellungen)
// ------------------------------------------------------------

export async function createTagGroup(name: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const label = cleanName(name);
  if (!label) return { error: "Bitte einen Gruppennamen angeben." };

  const existing = await prisma.tagGroup.findFirst({
    where: { companyId: admin.companyId, name: { equals: label, mode: "insensitive" } },
  });
  if (existing) return { error: `Die Gruppe „${existing.name}“ gibt es bereits.` };

  const max = await prisma.tagGroup.aggregate({ where: { companyId: admin.companyId }, _max: { order: true } });
  await prisma.tagGroup.create({
    data: { companyId: admin.companyId, name: label, order: (max._max.order ?? -1) + 1 },
  });

  revalidatePath(SETTINGS_PATH);
  return {};
}

export async function renameTagGroup(id: string, name: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const label = cleanName(name);
  if (!label) return { error: "Bitte einen Gruppennamen angeben." };

  const clash = await prisma.tagGroup.findFirst({
    where: { companyId: admin.companyId, id: { not: id }, name: { equals: label, mode: "insensitive" } },
  });
  if (clash) return { error: `Die Gruppe „${clash.name}“ gibt es bereits.` };

  await prisma.tagGroup.updateMany({ where: { id, companyId: admin.companyId }, data: { name: label } });
  revalidatePath(SETTINGS_PATH);
  return {};
}

// Die Tags der Gruppe bleiben erhalten und wandern in "Ohne Gruppe"
// (onDelete: SetNull) -- an Datensaetzen geht dadurch nichts verloren.
export async function deleteTagGroup(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  await prisma.tagGroup.deleteMany({ where: { id, companyId: admin.companyId } });
  revalidatePath(SETTINGS_PATH);
  return {};
}

export async function createTag(name: string, groupId: string | null): Promise<ActionResult> {
  const admin = await requireAdmin();
  const label = cleanName(name);
  if (!label) return { error: "Bitte einen Tag-Namen angeben." };

  if (groupId) {
    const group = await prisma.tagGroup.findFirst({ where: { id: groupId, companyId: admin.companyId } });
    if (!group) return { error: "Gruppe nicht gefunden." };
  }

  const existing = await prisma.tag.findFirst({
    where: { companyId: admin.companyId, name: { equals: label, mode: "insensitive" } },
  });
  if (existing) return { error: `Den Tag „${existing.name}“ gibt es bereits.` };

  await prisma.tag.create({ data: { companyId: admin.companyId, name: label, groupId } });
  revalidatePath(SETTINGS_PATH);
  return {};
}

export async function renameTag(id: string, name: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const label = cleanName(name);
  if (!label) return { error: "Bitte einen Tag-Namen angeben." };

  const clash = await prisma.tag.findFirst({
    where: { companyId: admin.companyId, id: { not: id }, name: { equals: label, mode: "insensitive" } },
  });
  if (clash) return { error: `Den Tag „${clash.name}“ gibt es bereits.` };

  await prisma.tag.updateMany({ where: { id, companyId: admin.companyId }, data: { name: label } });
  revalidatePath(SETTINGS_PATH);
  return {};
}

export async function moveTagToGroup(id: string, groupId: string | null): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (groupId) {
    const group = await prisma.tagGroup.findFirst({ where: { id: groupId, companyId: admin.companyId } });
    if (!group) return { error: "Gruppe nicht gefunden." };
  }
  await prisma.tag.updateMany({ where: { id, companyId: admin.companyId }, data: { groupId } });
  revalidatePath(SETTINGS_PATH);
  return {};
}

// Loescht den Tag samt Zuordnungen an allen Datensaetzen (Join-Tabellen
// kaskadieren) -- die Datensaetze selbst bleiben unberuehrt.
export async function deleteTag(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  await prisma.tag.deleteMany({ where: { id, companyId: admin.companyId } });
  revalidatePath(SETTINGS_PATH);
  return {};
}

// ------------------------------------------------------------
// Zuordnung an Datensaetzen (jeder Nutzer der Firma)
// ------------------------------------------------------------

function isTagEntity(value: string): value is TagEntity {
  return value in TAG_ENTITIES;
}

async function recordBelongsToCompany(entity: TagEntity, id: string, companyId: string): Promise<boolean> {
  const where = { id, companyId };
  switch (entity) {
    case "customer":
      return !!(await prisma.customer.findFirst({ where, select: { id: true } }));
    case "inquiry":
      return !!(await prisma.inquiry.findFirst({ where, select: { id: true } }));
    case "appointment":
      return !!(await prisma.appointment.findFirst({ where, select: { id: true } }));
    case "quote":
      return !!(await prisma.quote.findFirst({ where, select: { id: true } }));
    case "project":
      return !!(await prisma.project.findFirst({ where, select: { id: true } }));
    case "invoice":
      return !!(await prisma.invoice.findFirst({ where, select: { id: true } }));
    case "task":
      return !!(await prisma.task.findFirst({ where, select: { id: true } }));
  }
}

async function setTagLink(entity: TagEntity, id: string, tagId: string, op: "connect" | "disconnect") {
  const tags = { [op]: { id: tagId } };
  switch (entity) {
    case "customer":
      return prisma.customer.update({ where: { id }, data: { tags }, select: { id: true } });
    case "inquiry":
      return prisma.inquiry.update({ where: { id }, data: { tags }, select: { id: true } });
    case "appointment":
      return prisma.appointment.update({ where: { id }, data: { tags }, select: { id: true } });
    case "quote":
      return prisma.quote.update({ where: { id }, data: { tags }, select: { id: true } });
    case "project":
      return prisma.project.update({ where: { id }, data: { tags }, select: { id: true } });
    case "invoice":
      return prisma.invoice.update({ where: { id }, data: { tags }, select: { id: true } });
    case "task":
      return prisma.task.update({ where: { id }, data: { tags }, select: { id: true } });
  }
}

async function readRecordTags(entity: TagEntity, id: string): Promise<TagItem[]> {
  const select = { tags: { orderBy: { name: "asc" as const }, select: { id: true, name: true, groupId: true } } };
  const where = { id };
  let row: { tags: TagItem[] } | null = null;
  switch (entity) {
    case "customer":
      row = await prisma.customer.findUnique({ where, select });
      break;
    case "inquiry":
      row = await prisma.inquiry.findUnique({ where, select });
      break;
    case "appointment":
      row = await prisma.appointment.findUnique({ where, select });
      break;
    case "quote":
      row = await prisma.quote.findUnique({ where, select });
      break;
    case "project":
      row = await prisma.project.findUnique({ where, select });
      break;
    case "invoice":
      row = await prisma.invoice.findUnique({ where, select });
      break;
    case "task":
      row = await prisma.task.findUnique({ where, select });
      break;
  }
  return row?.tags ?? [];
}

async function changeRecordTag(
  entity: string,
  recordId: string,
  tagId: string,
  op: "connect" | "disconnect"
): Promise<{ error?: string; tags?: TagItem[] }> {
  if (!isTagEntity(entity)) return { error: "Unbekannter Datensatztyp." };
  const company = await getCurrentCompany();

  const [recordOk, tag] = await Promise.all([
    recordBelongsToCompany(entity, recordId, company.id),
    prisma.tag.findFirst({ where: { id: tagId, companyId: company.id }, select: { id: true } }),
  ]);
  if (!recordOk) return { error: "Datensatz nicht gefunden." };
  if (!tag) return { error: "Tag nicht gefunden." };

  await setTagLink(entity, recordId, tagId, op);

  revalidatePath(TAG_ENTITIES[entity].path(recordId));
  revalidatePath(TAG_ENTITIES[entity].listPath);
  return { tags: await readRecordTags(entity, recordId) };
}

export async function addTagToRecord(entity: string, recordId: string, tagId: string) {
  return changeRecordTag(entity, recordId, tagId, "connect");
}

export async function removeTagFromRecord(entity: string, recordId: string, tagId: string) {
  return changeRecordTag(entity, recordId, tagId, "disconnect");
}
