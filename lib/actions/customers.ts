"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany, getCurrentUser } from "@/lib/session";
import { getFieldConfig } from "@/lib/actions/field-config";
import { FIELD_CATALOGS } from "@/lib/field-config-catalog";

const customerSchema = z.object({
  name: z.string().nullish(), // Firmenname bei Geschäftskunden, sonst Fallback
  type: z.enum(["PRIVATE", "BUSINESS"]),
  salutation: z.enum(["HERR", "FRAU", "DIVERS"]).nullish().or(z.literal("")),
  firstName: z.string().nullish(),
  lastName: z.string().nullish(),
  email: z.string().email("Ungültige E-Mail-Adresse").nullish().or(z.literal("")),
  phone: z.string().nullish(),
  address: z.string().nullish(),
  zip: z.string().nullish(),
  city: z.string().nullish(),
  notes: z.string().nullish(),
});

// Bei Privatkunden wird der Anzeigename automatisch aus Vor-/Nachname
// zusammengesetzt. Bei Geschäftskunden bleibt der eingegebene Firmenname.
function resolveDisplayName(data: {
  type: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}): string {
  if (data.type === "PRIVATE") {
    const composed = [data.firstName, data.lastName].filter(Boolean).join(" ").trim();
    if (composed) return composed;
  }
  return data.name?.trim() || "";
}

export type CustomerFormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

// Prüft die admin-konfigurierten Pflichtfelder serverseitig (Formular-Attribut
// "required" allein reicht nicht, da Server Actions auch direkt aufrufbar sind).
async function checkConfiguredRequiredFields(
  data: Record<string, string | null | undefined>
): Promise<Record<string, string[]> | null> {
  const config = await getFieldConfig("customer");
  const errors: Record<string, string[]> = {};

  for (const field of FIELD_CATALOGS.customer) {
    const rule = config[field.key];
    if (rule?.required && !data[field.key]?.trim()) {
      errors[field.key] = [`${field.label} ist ein Pflichtfeld.`];
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

export async function createCustomer(
  _prevState: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  const parsed = customerSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    salutation: formData.get("salutation"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    zip: formData.get("zip"),
    city: formData.get("city"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const configErrors = await checkConfiguredRequiredFields(parsed.data);
  if (configErrors) {
    return { errors: configErrors };
  }

  const name = resolveDisplayName(parsed.data);
  if (!name) {
    return {
      errors:
        parsed.data.type === "PRIVATE"
          ? { lastName: ["Bitte mindestens den Nachnamen angeben."] }
          : { name: ["Bitte einen Firmennamen angeben."] },
    };
  }

  const company = await getCurrentCompany();

  const customer = await prisma.customer.create({
    data: {
      companyId: company.id,
      name,
      type: parsed.data.type,
      salutation: parsed.data.type === "PRIVATE" && parsed.data.salutation ? parsed.data.salutation : null,
      firstName: parsed.data.type === "PRIVATE" ? parsed.data.firstName || null : null,
      lastName: parsed.data.type === "PRIVATE" ? parsed.data.lastName || null : null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      zip: parsed.data.zip || null,
      city: parsed.data.city || null,
      notes: parsed.data.notes || null,
    },
  });

  await prisma.activity.create({
    data: {
      companyId: company.id,
      customerId: customer.id,
      type: "customer.created",
      message: `Kunde „${customer.name}“ wurde angelegt.`,
    },
  });

  revalidatePath("/kunden");
  redirect(`/kunden/${customer.id}`);
}

export async function updateCustomer(
  customerId: string,
  _prevState: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  const parsed = customerSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    salutation: formData.get("salutation"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    zip: formData.get("zip"),
    city: formData.get("city"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const configErrors = await checkConfiguredRequiredFields(parsed.data);
  if (configErrors) {
    return { errors: configErrors };
  }

  const company = await getCurrentCompany();
  const existing = await prisma.customer.findFirst({ where: { id: customerId, companyId: company.id } });
  if (!existing) {
    return { message: "Kunde nicht gefunden." };
  }

  const name = resolveDisplayName(parsed.data);
  if (!name) {
    return {
      errors:
        parsed.data.type === "PRIVATE"
          ? { lastName: ["Bitte mindestens den Nachnamen angeben."] }
          : { name: ["Bitte einen Firmennamen angeben."] },
    };
  }

  const customer = await prisma.customer.update({
    where: { id: customerId },
    data: {
      name,
      type: parsed.data.type,
      salutation: parsed.data.type === "PRIVATE" && parsed.data.salutation ? parsed.data.salutation : null,
      firstName: parsed.data.type === "PRIVATE" ? parsed.data.firstName || null : null,
      lastName: parsed.data.type === "PRIVATE" ? parsed.data.lastName || null : null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      zip: parsed.data.zip || null,
      city: parsed.data.city || null,
      notes: parsed.data.notes || null,
    },
  });

  await prisma.activity.create({
    data: {
      companyId: customer.companyId,
      customerId: customer.id,
      type: "customer.updated",
      message: `Stammdaten von „${customer.name}“ wurden aktualisiert.`,
    },
  });

  revalidatePath("/kunden");
  revalidatePath(`/kunden/${customerId}`);
  redirect(`/kunden/${customerId}`);
}

export async function createCustomerQuick(data: {
  name: string;
  type: "PRIVATE" | "BUSINESS";
  email?: string;
  phone?: string;
  force?: boolean;
}): Promise<{ customer?: { id: string; name: string }; duplicate?: { id: string; name: string } } | null> {
  if (!data.name.trim()) return null;
  const company = await getCurrentCompany();

  const email = data.email?.trim() || null;
  const phone = data.phone?.trim() || null;

  // Warnt statt zu blockieren -- verhindert versehentliche Dubletten (z.B.
  // wenn derselbe Kunde ueber die Schnell-Anlage in einem anderen
  // Zusammenhang nochmal eingetippt wird), erlaubt aber bewusstes Anlegen
  // trotzdem (z.B. zwei Personen mit gemeinsamer Telefonnummer).
  if (!data.force && (email || phone)) {
    const existing = await prisma.customer.findFirst({
      where: {
        companyId: company.id,
        OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
      },
    });
    if (existing) {
      return { duplicate: { id: existing.id, name: existing.name } };
    }
  }

  const customer = await prisma.customer.create({
    data: {
      companyId: company.id,
      name: data.name.trim(),
      type: data.type,
      email,
      phone,
    },
  });

  await prisma.activity.create({
    data: {
      companyId: company.id,
      customerId: customer.id,
      type: "customer.created",
      message: `Kunde „${customer.name}“ wurde angelegt.`,
    },
  });

  revalidatePath("/kunden");
  return { customer: { id: customer.id, name: customer.name } };
}

export async function archiveCustomer(customerId: string) {
  const company = await getCurrentCompany();
  const customer = await prisma.customer.findFirst({ where: { id: customerId, companyId: company.id } });
  if (!customer) return;

  await prisma.customer.update({ where: { id: customerId }, data: { archivedAt: new Date() } });

  await prisma.activity.create({
    data: {
      companyId: company.id,
      customerId,
      type: "customer.archived",
      message: `Kunde „${customer.name}“ wurde archiviert.`,
    },
  });

  revalidatePath("/kunden");
  revalidatePath(`/kunden/${customerId}`);
}

export async function unarchiveCustomer(customerId: string) {
  const company = await getCurrentCompany();
  const customer = await prisma.customer.findFirst({ where: { id: customerId, companyId: company.id } });
  if (!customer) return;

  await prisma.customer.update({ where: { id: customerId }, data: { archivedAt: null } });

  await prisma.activity.create({
    data: {
      companyId: company.id,
      customerId,
      type: "customer.unarchived",
      message: `Kunde „${customer.name}“ wurde wieder aktiviert.`,
    },
  });

  revalidatePath("/kunden");
  revalidatePath(`/kunden/${customerId}`);
}

export async function createContact(
  customerId: string,
  data: { name: string; role?: string; email?: string; phone?: string }
) {
  if (!data.name.trim()) return;
  const company = await getCurrentCompany();
  const customer = await prisma.customer.findFirst({ where: { id: customerId, companyId: company.id } });
  if (!customer) return;

  await prisma.contact.create({
    data: {
      customerId,
      name: data.name.trim(),
      role: data.role?.trim() || null,
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
    },
  });

  revalidatePath(`/kunden/${customerId}`);
}

export async function deleteContact(contactId: string, customerId: string) {
  const company = await getCurrentCompany();
  const customer = await prisma.customer.findFirst({ where: { id: customerId, companyId: company.id } });
  if (!customer) return;

  await prisma.contact.deleteMany({ where: { id: contactId, customerId } });
  revalidatePath(`/kunden/${customerId}`);
}

export async function addCustomerComment(customerId: string, content: string) {
  if (!content.trim()) return;

  const user = await getCurrentUser();
  const company = await getCurrentCompany();
  const customer = await prisma.customer.findFirst({ where: { id: customerId, companyId: company.id } });
  if (!customer) return;

  await prisma.comment.create({
    data: {
      userId: user.id,
      customerId,
      content,
    },
  });

  revalidatePath(`/kunden/${customerId}`);
}
