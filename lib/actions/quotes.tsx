"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import { DocumentPdf } from "@/lib/pdf/document-pdf";
import { buildPlaceholderContext } from "@/lib/pdf/build-context";
import { resolvePlaceholders } from "@/lib/document-placeholders";
import { resolveCompanyLogoUrl } from "@/lib/blob-signed-url";
import { sendDocumentEmail } from "@/lib/email";
import { getSalutationShort } from "@/lib/customer-salutation";
import { createWithUniqueNumber } from "@/lib/numbering";
import type { QuoteStatus } from "@prisma/client";

const quoteSchema = z.object({
  customerId: z.string().min(1, "Bitte einen Kunden auswählen"),
  inquiryId: z.string().optional(),
  projectId: z.string().optional(),
  title: z.string().min(2, "Titel muss mindestens 2 Zeichen haben"),
  validUntil: z.string().optional(),
  discountValue: z.string().optional(),
  discountType: z.string().optional(),
});

export type QuoteFormState = {
  errors?: Record<string, string[]>;
  message?: string;
};

function computeTotals(
  items: { quantity: number; unitPrice: number; taxRate: number }[],
  discountValue: number,
  discountType: string
) {
  const netBeforeDiscount = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const grossBeforeDiscount = items.reduce(
    (sum, i) => sum + i.quantity * i.unitPrice * (1 + i.taxRate / 100),
    0
  );
  const discountAmount =
    discountType === "PERCENT" ? netBeforeDiscount * (discountValue / 100) : discountValue;
  const netAfterDiscount = Math.max(0, netBeforeDiscount - discountAmount);
  const factor = netBeforeDiscount > 0 ? netAfterDiscount / netBeforeDiscount : 1;
  const grossAfterDiscount = grossBeforeDiscount * factor;
  // Durchschnittlicher Steuersatz nur als Legacy-/Anzeigewert
  const avgTaxRate = netAfterDiscount > 0 ? ((grossAfterDiscount - netAfterDiscount) / netAfterDiscount) * 100 : 19;
  return { netAfterDiscount, grossAfterDiscount, discountAmount, avgTaxRate };
}

export async function createQuote(
  _prevState: QuoteFormState,
  formData: FormData
): Promise<QuoteFormState> {
  const parsed = quoteSchema.safeParse({
    customerId: formData.get("customerId"),
    inquiryId: formData.get("inquiryId") || undefined,
    projectId: formData.get("projectId") || undefined,
    title: formData.get("title"),
    validUntil: formData.get("validUntil") || undefined,
    discountValue: formData.get("discountValue") || undefined,
    discountType: formData.get("discountType") || undefined,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const itemCount = Number(formData.get("itemCount") || 0);
  const items: { description: string; quantity: number; unit: string; unitPrice: number; taxRate: number }[] = [];

  for (let i = 0; i < itemCount; i++) {
    const description = String(formData.get(`item_description_${i}`) || "").trim();
    const quantity = Number(formData.get(`item_quantity_${i}`) || 0);
    const unit = String(formData.get(`item_unit_${i}`) || "Stk");
    const unitPrice = Number(formData.get(`item_unitPrice_${i}`) || 0);
    const taxRate = Number(formData.get(`item_taxRate_${i}`) || 19);
    if (description && quantity > 0) {
      items.push({ description, quantity, unit, unitPrice, taxRate });
    }
  }

  if (items.length === 0) {
    return { message: "Bitte mindestens eine Position mit Menge > 0 hinzufügen." };
  }

  const company = await getCurrentCompany();
  const customer = await prisma.customer.findFirst({ where: { id: parsed.data.customerId, companyId: company.id } });
  if (!customer) {
    return { errors: { customerId: ["Kunde nicht gefunden."] } };
  }
  if (parsed.data.inquiryId) {
    const inquiry = await prisma.inquiry.findFirst({ where: { id: parsed.data.inquiryId, companyId: company.id } });
    if (!inquiry) return { message: "Anfrage nicht gefunden." };
  }
  if (parsed.data.projectId) {
    const project = await prisma.project.findFirst({ where: { id: parsed.data.projectId, companyId: company.id } });
    if (!project) return { message: "Auftrag nicht gefunden." };
  }

  const discountValue = Number(parsed.data.discountValue) || 0;
  const discountType = parsed.data.discountType === "PERCENT" ? "PERCENT" : "AMOUNT";
  const { netAfterDiscount, grossAfterDiscount, avgTaxRate } = computeTotals(items, discountValue, discountType);

  const quote = await createWithUniqueNumber("quote", company.id, company.quoteNumberFormat, (number) =>
    prisma.quote.create({
      data: {
        companyId: company.id,
        customerId: parsed.data.customerId,
        inquiryId: parsed.data.inquiryId || null,
        number,
        title: parsed.data.title,
        validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : null,
        totalNet: netAfterDiscount,
        totalGross: grossAfterDiscount,
        taxRate: avgTaxRate,
        discountValue: discountValue > 0 ? discountValue : null,
        discountType,
        items: {
          create: items.map((item, i) => ({ ...item, position: i + 1 })),
        },
      },
    })
  );

  await prisma.activity.create({
    data: {
      companyId: company.id,
      customerId: parsed.data.customerId,
      quoteId: quote.id,
      type: "quote.created",
      message: `Angebot ${quote.number} „${quote.title}“ wurde erstellt (${grossAfterDiscount.toFixed(2)} €).`,
    },
  });

  if (parsed.data.inquiryId) {
    await prisma.inquiry.update({
      where: { id: parsed.data.inquiryId },
      data: { status: "QUOTE_CREATED" },
    });
  }

  if (parsed.data.projectId) {
    await prisma.project.update({
      where: { id: parsed.data.projectId },
      data: { quoteId: quote.id },
    });
    await prisma.activity.create({
      data: {
        companyId: company.id,
        customerId: parsed.data.customerId,
        projectId: parsed.data.projectId,
        type: "quote.linked",
        message: `Angebot ${quote.number} wurde mit diesem Auftrag verknüpft.`,
      },
    });
  }

  revalidatePath("/angebote");
  revalidatePath("/anfragen");
  revalidatePath("/arbeit");
  redirect(`/angebote/${quote.id}`);
}

// Bearbeitet ein bestehendes Angebot -- nur solange es im Entwurf ist (danach
// könnte der Kunde es bereits gesehen haben, oder es ist schon zu einem
// Auftrag geworden).
export async function updateQuote(
  quoteId: string,
  _prevState: QuoteFormState,
  formData: FormData
): Promise<QuoteFormState> {
  const parsed = quoteSchema.safeParse({
    customerId: formData.get("customerId"),
    inquiryId: formData.get("inquiryId") || undefined,
    projectId: formData.get("projectId") || undefined,
    title: formData.get("title"),
    validUntil: formData.get("validUntil") || undefined,
    discountValue: formData.get("discountValue") || undefined,
    discountType: formData.get("discountType") || undefined,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const itemCount = Number(formData.get("itemCount") || 0);
  const items: { description: string; quantity: number; unit: string; unitPrice: number; taxRate: number }[] = [];

  for (let i = 0; i < itemCount; i++) {
    const description = String(formData.get(`item_description_${i}`) || "").trim();
    const quantity = Number(formData.get(`item_quantity_${i}`) || 0);
    const unit = String(formData.get(`item_unit_${i}`) || "Stk");
    const unitPrice = Number(formData.get(`item_unitPrice_${i}`) || 0);
    const taxRate = Number(formData.get(`item_taxRate_${i}`) || 19);
    if (description && quantity > 0) {
      items.push({ description, quantity, unit, unitPrice, taxRate });
    }
  }

  if (items.length === 0) {
    return { message: "Bitte mindestens eine Position mit Menge > 0 hinzufügen." };
  }

  const company = await getCurrentCompany();
  const existing = await prisma.quote.findFirst({ where: { id: quoteId, companyId: company.id } });
  if (!existing) return { message: "Angebot nicht gefunden." };
  if (existing.status !== "DRAFT") {
    return { message: "Nur Angebote im Entwurf können bearbeitet werden." };
  }

  const customer = await prisma.customer.findFirst({ where: { id: parsed.data.customerId, companyId: company.id } });
  if (!customer) {
    return { errors: { customerId: ["Kunde nicht gefunden."] } };
  }

  const discountValue = Number(parsed.data.discountValue) || 0;
  const discountType = parsed.data.discountType === "PERCENT" ? "PERCENT" : "AMOUNT";
  const { netAfterDiscount, grossAfterDiscount, avgTaxRate } = computeTotals(items, discountValue, discountType);

  await prisma.$transaction(async (tx) => {
    await tx.quoteItem.deleteMany({ where: { quoteId } });
    await tx.quote.update({
      where: { id: quoteId },
      data: {
        customerId: parsed.data.customerId,
        inquiryId: parsed.data.inquiryId || null,
        title: parsed.data.title,
        validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : null,
        totalNet: netAfterDiscount,
        totalGross: grossAfterDiscount,
        taxRate: avgTaxRate,
        discountValue: discountValue > 0 ? discountValue : null,
        discountType,
        items: {
          create: items.map((item, i) => ({ ...item, position: i + 1 })),
        },
      },
    });
  });

  await prisma.activity.create({
    data: {
      companyId: company.id,
      customerId: parsed.data.customerId,
      quoteId,
      type: "quote.updated",
      message: `Angebot ${existing.number} „${parsed.data.title}“ wurde bearbeitet.`,
    },
  });

  revalidatePath("/angebote");
  revalidatePath(`/angebote/${quoteId}`);
  redirect(`/angebote/${quoteId}`);
}

// Dupliziert ein Angebot als Ausgangspunkt fuer eine neue Variante (z.B. ein
// revidiertes Angebot nach Ablehnung, oder eine aehnliche Leistung fuer einen
// anderen Kunden). Immer als neuer Entwurf, unabhaengig vom Status des Originals.
export async function duplicateQuote(quoteId: string) {
  const company = await getCurrentCompany();
  const original = await prisma.quote.findFirst({
    where: { id: quoteId, companyId: company.id },
    include: { items: { orderBy: { position: "asc" } } },
  });
  if (!original) return;

  const quote = await createWithUniqueNumber("quote", company.id, company.quoteNumberFormat, (number) =>
    prisma.quote.create({
      data: {
        companyId: company.id,
        customerId: original.customerId,
        number,
        title: `${original.title} (Kopie)`,
        status: "DRAFT",
        validUntil: original.validUntil,
        totalNet: original.totalNet,
        totalGross: original.totalGross,
        taxRate: original.taxRate,
        discountValue: original.discountValue,
        discountType: original.discountType,
        items: {
          create: original.items.map((item) => ({
            position: item.position,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
          })),
        },
      },
    })
  );

  await prisma.activity.create({
    data: {
      companyId: company.id,
      customerId: original.customerId,
      quoteId: quote.id,
      type: "quote.created",
      message: `Angebot ${quote.number} als Kopie von ${original.number} erstellt.`,
    },
  });

  revalidatePath("/angebote");
  redirect(`/angebote/${quote.id}`);
}

export async function updateQuoteStatus(quoteId: string, status: QuoteStatus) {
  const company = await getCurrentCompany();
  const existing = await prisma.quote.findFirst({ where: { id: quoteId, companyId: company.id } });
  if (!existing) return;

  const quote = await prisma.quote.update({ where: { id: quoteId }, data: { status } });

  await prisma.activity.create({
    data: {
      companyId: quote.companyId,
      customerId: quote.customerId,
      quoteId: quote.id,
      type: "quote.status_changed",
      message: `Angebot ${quote.number} → Status „${status}“.`,
    },
  });

  // Bei Ablehnung/Ablauf bleibt die Anfrage sonst dauerhaft auf "Angebot erstellt"
  // stehen, obwohl der Vorgang gescheitert ist -- zurück auf "Telefonat erfolgt",
  // damit die Pipeline korrekt anzeigt, dass wieder nachgefasst werden muss.
  if ((status === "REJECTED" || status === "EXPIRED") && quote.inquiryId) {
    const inquiry = await prisma.inquiry.findUnique({ where: { id: quote.inquiryId } });
    if (inquiry?.status === "QUOTE_CREATED") {
      await prisma.inquiry.update({ where: { id: quote.inquiryId }, data: { status: "CALL_DONE" } });
      revalidatePath(`/anfragen/${quote.inquiryId}`);
      revalidatePath("/anfragen");
    }
  }

  revalidatePath(`/angebote/${quoteId}`);
  revalidatePath("/angebote");
}

// Angebot annehmen: setzt Status auf ACCEPTED und erzeugt automatisch einen Auftrag
// (außer es ist bereits einer verknüpft, z.B. direkt bei Angebot-Erstellung gewählt)
export async function acceptQuote(quoteId: string) {
  const currentCompany = await getCurrentCompany();
  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, companyId: currentCompany.id },
    include: { project: true },
  });
  if (!quote) return;

  let project = quote.project;

  if (!project) {
    project = await createWithUniqueNumber("project", quote.companyId, "AUF-{YYYY}-{NNNN}", (projectNumber) =>
      prisma.$transaction(async (tx) => {
        const currentProject = await tx.project.create({
          data: {
            companyId: quote.companyId,
            customerId: quote.customerId,
            quoteId: quote.id,
            number: projectNumber,
            title: quote.title,
            status: "PLANNED",
          },
        });

        await tx.activity.create({
          data: {
            companyId: quote.companyId,
            customerId: quote.customerId,
            projectId: currentProject.id,
            type: "project.created",
            message: `Auftrag ${currentProject.number} aus Angebot ${quote.number} erstellt.`,
          },
        });

        await tx.quote.update({ where: { id: quoteId }, data: { status: "ACCEPTED" } });

        if (quote.inquiryId) {
          await tx.inquiry.update({ where: { id: quote.inquiryId }, data: { status: "WON" } });
        }

        return currentProject;
      })
    );
  } else {
    await prisma.$transaction(async (tx) => {
      await tx.quote.update({ where: { id: quoteId }, data: { status: "ACCEPTED" } });
      if (quote.inquiryId) {
        await tx.inquiry.update({ where: { id: quote.inquiryId }, data: { status: "WON" } });
      }
    });
  }

  if (!project) return;

  revalidatePath("/angebote");
  revalidatePath("/arbeit");
  revalidatePath("/anfragen");
  redirect(`/arbeit/${project.id}`);
}

// Angebot per E-Mail an den Kunden senden (mit PDF im Anhang), markiert es
// gleichzeitig als "Versendet".
export async function sendQuoteEmail(
  quoteId: string,
  customMessage?: string
): Promise<{ error?: string; success?: boolean }> {
  const currentCompany = await getCurrentCompany();
  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, companyId: currentCompany.id },
    include: { customer: true, company: true, items: { orderBy: { position: "asc" } } },
  });

  if (!quote) return { error: "Angebot nicht gefunden." };
  if (!quote.customer.email) {
    return { error: "Für diesen Kunden ist keine E-Mail-Adresse hinterlegt." };
  }

  const template = await prisma.documentTemplate.findFirst({
    where: { companyId: quote.companyId, type: "QUOTE", isDefault: true },
  });

  const createdAtStr = quote.createdAt.toLocaleDateString("de-DE");
  const validUntilStr = quote.validUntil ? quote.validUntil.toLocaleDateString("de-DE") : undefined;

  const context = buildPlaceholderContext({
    company: quote.company,
    customer: quote.customer,
    number: quote.number,
    title: quote.title,
    createdAt: createdAtStr,
    validUntilOrDue: validUntilStr,
    totalNet: Number(quote.totalNet),
    totalGross: Number(quote.totalGross),
  });

  const pdfCompany = await resolveCompanyLogoUrl(quote.company);
  const pdfBuffer = await renderToBuffer(
    <DocumentPdf
      kind="Angebot"
      number={quote.number}
      title={quote.title}
      createdAt={createdAtStr}
      validUntilOrDue={validUntilStr}
      company={pdfCompany}
      customer={quote.customer}
      items={quote.items.map((i) => ({
        description: i.description,
        quantity: Number(i.quantity),
        unit: i.unit,
        unitPrice: Number(i.unitPrice),
        taxRate: Number(i.taxRate),
      }))}
      totalNet={Number(quote.totalNet)}
      totalGross={Number(quote.totalGross)}
      taxRate={Number(quote.taxRate)}
      discountValue={quote.discountValue != null ? Number(quote.discountValue) : undefined}
      discountType={quote.discountType as "AMOUNT" | "PERCENT"}
      introTextOverride={template?.introText ? resolvePlaceholders(template.introText, context) : undefined}
      footerTextOverride={template?.footerText ? resolvePlaceholders(template.footerText, context) : undefined}
      showVatOverride={template?.showVat}
      accentColorOverride={template?.accentColor}
    />
  );

  try {
    await sendDocumentEmail({
      to: quote.customer.email,
      greeting: getSalutationShort(quote.customer),
      kind: "Angebot",
      number: quote.number,
      amount: `${Number(quote.totalGross).toLocaleString("de-DE")} €`,
      message: customMessage,
      pdfBuffer,
      company: quote.company,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "E-Mail-Versand fehlgeschlagen." };
  }

  if (quote.status === "DRAFT") {
    await prisma.quote.update({ where: { id: quoteId }, data: { status: "SENT" } });
  }

  await prisma.activity.create({
    data: {
      companyId: quote.companyId,
      customerId: quote.customerId,
      quoteId: quote.id,
      type: "quote.emailed",
      message: `Angebot ${quote.number} wurde per E-Mail an ${quote.customer.email} versendet.`,
    },
  });

  revalidatePath(`/angebote/${quoteId}`);
  revalidatePath("/angebote");
  return { success: true };
}

// ---- Versionierung ----

export async function saveQuoteVersion(quoteId: string) {
  const company = await getCurrentCompany();
  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, companyId: company.id },
    include: { items: { orderBy: { position: "asc" } } },
  });
  if (!quote) return;

  const maxVersion = await prisma.quoteVersion.aggregate({
    where: { quoteId },
    _max: { versionNumber: true },
  });
  const versionNumber = (maxVersion._max.versionNumber ?? 0) + 1;

  await prisma.quoteVersion.create({
    data: {
      quoteId,
      versionNumber,
      snapshot: {
        title: quote.title,
        totalNet: Number(quote.totalNet),
        totalGross: Number(quote.totalGross),
        discountValue: quote.discountValue != null ? Number(quote.discountValue) : null,
        discountType: quote.discountType,
        validUntil: quote.validUntil?.toISOString() ?? null,
        items: quote.items.map((i) => ({
          description: i.description,
          quantity: Number(i.quantity),
          unit: i.unit,
          unitPrice: Number(i.unitPrice),
          taxRate: Number(i.taxRate),
        })),
      },
    },
  });

  revalidatePath(`/angebote/${quoteId}`);
}

// Setzt ein Angebot auf einen frueheren gespeicherten Stand zurueck. Der
// aktuelle Stand wird davor selbst als Version gesichert, damit auch das
// Wiederherstellen rueckgaengig gemacht werden kann.
export async function restoreQuoteVersion(
  quoteId: string,
  versionId: string
): Promise<{ error?: string; success?: boolean }> {
  const company = await getCurrentCompany();
  const quote = await prisma.quote.findFirst({ where: { id: quoteId, companyId: company.id } });
  if (!quote) return { error: "Angebot nicht gefunden." };
  if (quote.status !== "DRAFT") {
    return { error: "Nur Angebote im Entwurf können wiederhergestellt werden." };
  }

  const version = await prisma.quoteVersion.findFirst({ where: { id: versionId, quoteId } });
  if (!version) return { error: "Version nicht gefunden." };

  const snapshot = version.snapshot as {
    title: string;
    discountValue: number | null;
    discountType: string;
    validUntil: string | null;
    items: { description: string; quantity: number; unit: string; unitPrice: number; taxRate: number }[];
  };

  await saveQuoteVersion(quoteId);

  const discountValue = snapshot.discountValue ?? 0;
  const discountType = snapshot.discountType === "PERCENT" ? "PERCENT" : "AMOUNT";
  const { netAfterDiscount, grossAfterDiscount, avgTaxRate } = computeTotals(
    snapshot.items,
    discountValue,
    discountType
  );

  await prisma.$transaction(async (tx) => {
    await tx.quoteItem.deleteMany({ where: { quoteId } });
    await tx.quote.update({
      where: { id: quoteId },
      data: {
        title: snapshot.title,
        validUntil: snapshot.validUntil ? new Date(snapshot.validUntil) : null,
        totalNet: netAfterDiscount,
        totalGross: grossAfterDiscount,
        taxRate: avgTaxRate,
        discountValue: discountValue > 0 ? discountValue : null,
        discountType,
        items: { create: snapshot.items.map((item, i) => ({ ...item, position: i + 1 })) },
      },
    });
  });

  await prisma.activity.create({
    data: {
      companyId: company.id,
      customerId: quote.customerId,
      quoteId,
      type: "quote.version_restored",
      message: `Angebot ${quote.number} wurde auf Version ${version.versionNumber} zurückgesetzt.`,
    },
  });

  revalidatePath(`/angebote/${quoteId}`);
  return { success: true };
}
