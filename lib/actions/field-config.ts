"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany, requireAdmin } from "@/lib/session";
import { FIELD_CATALOGS } from "@/lib/field-config-catalog";

export type FieldConfigMap = Record<string, { visible: boolean; required: boolean }>;

export async function getFieldConfig(formKey: string): Promise<FieldConfigMap> {
  const company = await getCurrentCompany();
  const rows = await prisma.fieldConfig.findMany({
    where: { companyId: company.id, formKey },
  });

  const map: FieldConfigMap = {};
  const catalog = FIELD_CATALOGS[formKey] ?? [];
  for (const entry of catalog) {
    map[entry.key] = { visible: true, required: false };
  }
  for (const row of rows) {
    map[row.fieldKey] = { visible: row.visible, required: row.required };
  }
  return map;
}

export async function updateFieldConfig(
  formKey: string,
  configs: { fieldKey: string; visible: boolean; required: boolean }[]
) {
  const admin = await requireAdmin();

  await Promise.all(
    configs.map((c) =>
      prisma.fieldConfig.upsert({
        where: { companyId_formKey_fieldKey: { companyId: admin.companyId, formKey, fieldKey: c.fieldKey } },
        create: {
          companyId: admin.companyId,
          formKey,
          fieldKey: c.fieldKey,
          visible: c.visible,
          required: c.required,
        },
        update: { visible: c.visible, required: c.required },
      })
    )
  );

  revalidatePath("/einstellungen/vertrieb");
  revalidatePath("/kunden/neu");
  revalidatePath("/kunden", "layout");
}
