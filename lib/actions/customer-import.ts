"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { nextCustomerNumber } from "@/lib/customer-numbering";
import {
  duplicateKeys,
  prepareImportRow,
  type ImportDefaults,
  type RawImportRow,
} from "@/lib/customer-import";

// Obergrenze pro Aufruf -- der Client teilt grosse Dateien in Pakete, damit
// ein einzelner Aufruf nicht in ein Zeitlimit laeuft.
const MAX_ROWS_PER_CALL = 200;
const MAX_TEXT = 300;

function clip(value: string | null): string | null {
  return value ? value.slice(0, MAX_TEXT) : value;
}

async function loadExistingKeys(companyId: string): Promise<Set<string>> {
  const existing = await prisma.customer.findMany({
    where: { companyId },
    select: { name: true, email: true, zip: true },
  });
  const keys = new Set<string>();
  for (const c of existing) {
    for (const k of duplicateKeys({ name: c.name, email: c.email, zip: c.zip })) keys.add(k);
  }
  return keys;
}

// Vorschau: welche Zeilen kollidieren mit bereits vorhandenen Kunden?
export async function analyzeCustomerImport(
  rows: RawImportRow[],
  defaults: ImportDefaults
): Promise<{ duplicates: boolean[] }> {
  const admin = await requireAdmin();
  if (rows.length > MAX_ROWS_PER_CALL * 5) return { duplicates: rows.map(() => false) };

  const existing = await loadExistingKeys(admin.companyId);
  return {
    duplicates: rows.map((raw) => {
      const prepared = prepareImportRow(raw, defaults);
      if (!prepared.ok) return false;
      return duplicateKeys(prepared.data).some((k) => existing.has(k));
    }),
  };
}

export type ImportChunkResult = {
  created: number;
  skipped: number;
  failed: { index: number; error: string }[];
  error?: string;
};

export async function importCustomerChunk(
  rows: RawImportRow[],
  defaults: ImportDefaults,
  skipDuplicates: boolean
): Promise<ImportChunkResult> {
  const admin = await requireAdmin();
  if (rows.length === 0) return { created: 0, skipped: 0, failed: [] };
  if (rows.length > MAX_ROWS_PER_CALL) {
    return { created: 0, skipped: 0, failed: [], error: "Zu viele Zeilen auf einmal." };
  }

  const companyId = admin.companyId;

  // Tags nur uebernehmen, wenn sie wirklich zur eigenen Firma gehoeren
  const tags =
    defaults.tagIds.length > 0
      ? await prisma.tag.findMany({
          where: { companyId, id: { in: defaults.tagIds } },
          select: { id: true },
        })
      : [];
  const tagConnect = tags.map((t) => ({ id: t.id }));

  const customerSince = /^\d{4}-\d{2}-\d{2}$/.test(defaults.customerSince)
    ? new Date(`${defaults.customerSince}T12:00:00`)
    : undefined;

  const existingKeys = await loadExistingKeys(companyId);
  const result: ImportChunkResult = { created: 0, skipped: 0, failed: [] };

  for (let index = 0; index < rows.length; index++) {
    const prepared = prepareImportRow(rows[index], defaults);
    if (!prepared.ok) {
      result.failed.push({ index, error: prepared.error });
      continue;
    }
    const d = prepared.data;

    const keys = duplicateKeys(d);
    if (skipDuplicates && keys.some((k) => existingKeys.has(k))) {
      result.skipped++;
      continue;
    }

    try {
      // Mitgelieferte Kundennummer nur uebernehmen, wenn sie noch frei ist --
      // sonst automatisch vergeben (siehe Company.customerNumberFormat).
      let number: string | null = null;
      if (d.number) {
        const taken = await prisma.customer.findFirst({
          where: { companyId, number: d.number },
          select: { id: true },
        });
        if (!taken) number = d.number.slice(0, 50);
      }
      if (!number) number = await nextCustomerNumber(companyId);

      const customer = await prisma.customer.create({
        data: {
          companyId,
          name: clip(d.name)!,
          number,
          type: d.type,
          salutation: d.salutation,
          firstName: clip(d.firstName),
          lastName: clip(d.lastName),
          email: clip(d.email),
          phone: clip(d.phone),
          address: clip(d.address),
          zip: clip(d.zip),
          city: clip(d.city),
          country: clip(d.country),
          notes: d.notes ? d.notes.slice(0, 5000) : null,
          ...(customerSince ? { customerSince } : {}),
          ...(tagConnect.length > 0 ? { tags: { connect: tagConnect } } : {}),
        },
        select: { id: true },
      });

      if (d.contactName) {
        await prisma.contact.create({
          data: {
            customerId: customer.id,
            companyId,
            number: await nextCustomerNumber(companyId),
            name: clip(d.contactName)!,
          },
        });
      }

      for (const k of keys) existingKeys.add(k);
      result.created++;
    } catch {
      result.failed.push({ index, error: "Konnte nicht gespeichert werden." });
    }
  }

  return result;
}

// Ein Eintrag im Aktivitaets-Feed fuer den ganzen Import (statt einem pro Kunde)
export async function finishCustomerImport(created: number, tagIds: string[]): Promise<void> {
  const admin = await requireAdmin();
  if (created > 0) {
    const tags =
      tagIds.length > 0
        ? await prisma.tag.findMany({ where: { companyId: admin.companyId, id: { in: tagIds } }, select: { name: true } })
        : [];
    const tagInfo = tags.length > 0 ? ` (Tags: ${tags.map((t) => t.name).join(", ")})` : "";
    await prisma.activity.create({
      data: {
        companyId: admin.companyId,
        userId: admin.id,
        type: "customer.imported",
        message: `${created} Kunde${created !== 1 ? "n" : ""} per CSV-Import angelegt${tagInfo}.`,
      },
    });
  }
  revalidatePath("/kunden");
}
