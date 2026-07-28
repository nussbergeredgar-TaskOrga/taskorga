"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany, getCurrentUser } from "@/lib/session";

const customerSchema = z.object({
  name: z.string().optional(), // Firmenname bei Geschäftskunden, sonst Fallback
  type: z.enum(["PRIVATE", "BUSINESS"]),
  salutation: z.enum(["HERR", "FRAU", "DIVERS"]).optional().or(z.literal("")),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email("Ungültige E-Mail-Adresse").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  zip: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
});

// Bei Privatkunden wird der Anzeigename automatisch aus Vor-/Nachname
// zusammengesetzt. Bei Geschäftskunden bleibt der eingegebene Firmenname.
function resolveDisplayName(data: {
  type: string;
  name?: string;
  firstName?: string;
  lastName?: string;
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
  redirect(`/kunden/${customerId}`);
}

export async function createCustomerQuick(data: {
  name: string;
  type: "PRIVATE" | "BUSINESS";
  email?: string;
  phone?: string;
}) {
  if (!data.name.trim()) return null;
  const company = await getCurrentCompany();

  const customer = await prisma.customer.create({
    data: {
      companyId: company.id,
      name: data.name.trim(),
      type: data.type,
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
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
  return customer;
}

export async function addCustomerComment(customerId: string, content: string) {
  if (!content.trim()) return;

  const user = await getCurrentUser();

  await prisma.comment.create({
    data: {
      userId: user.id,
      customerId,
      content,
    },
  });

  revalidatePath(`/kunden/${customerId}`);
}
