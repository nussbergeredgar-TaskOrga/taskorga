"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { deleteCompanyData } from "@/lib/company-deletion";

// DSGVO "Recht auf Löschung": entfernt die komplette Firma inkl. aller
// verknüpften Daten unwiderruflich.
export async function deleteCompanyAccount(confirmName: string): Promise<{ error?: string; success?: boolean }> {
  const admin = await requireAdmin();
  const company = await prisma.company.findUnique({ where: { id: admin.companyId } });
  if (!company) return { error: "Firma nicht gefunden." };
  if (confirmName.trim() !== company.name) {
    return { error: "Der eingegebene Name stimmt nicht mit dem Firmennamen überein." };
  }

  try {
    await deleteCompanyData(company.id);
  } catch {
    return { error: "Löschen fehlgeschlagen. Es wurde nichts geändert — bitte erneut versuchen oder Support kontaktieren." };
  }

  return { success: true };
}
