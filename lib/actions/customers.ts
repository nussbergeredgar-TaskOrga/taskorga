"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany, getCurrentUser } from "@/lib/session";

const customerSchema = z.object({
  name: z.string().min(2, "Name muss mindestens 2 Zeichen haben"),
  type: z.enum(["PRIVATE", "BUSINESS"]),
  email: z.string().email("Ungültige E-Mail-Adresse").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  zip: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
});

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

  const company = await getCurrentCompany();

  const customer = await prisma.customer.create({
    data: {
      companyId: company.id,
      name: parsed.data.name,
      type: parsed.data.type,
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

  const customer = await prisma.customer.update({
    where: { id: customerId },
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
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
