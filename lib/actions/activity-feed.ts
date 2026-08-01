"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentCompany } from "@/lib/session";
import type { Prisma } from "@prisma/client";

export type ActivityItem = {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  href: string | null;
};

type ActivityRow = {
  id: string;
  type: string;
  message: string;
  createdAt: Date;
  customerId: string | null;
  inquiryId: string | null;
  quoteId: string | null;
  projectId: string | null;
  invoiceId: string | null;
  appointmentId: string | null;
};

function buildHref(a: ActivityRow): string | null {
  if (a.invoiceId) return `/finanzen/${a.invoiceId}`;
  if (a.quoteId) return `/angebote/${a.quoteId}`;
  if (a.projectId) return `/arbeit/${a.projectId}`;
  if (a.appointmentId) return `/termine/${a.appointmentId}`;
  if (a.inquiryId) return `/anfragen/${a.inquiryId}`;
  if (a.customerId) return `/kunden/${a.customerId}`;
  return null;
}

export async function getActivities({
  typePrefix,
  search,
  skip = 0,
  take = 7,
}: {
  typePrefix?: string;
  search?: string;
  skip?: number;
  take?: number;
}): Promise<{ items: ActivityItem[]; hasMore: boolean }> {
  const company = await getCurrentCompany();

  const where: Prisma.ActivityWhereInput = { companyId: company.id };
  if (typePrefix) where.type = { startsWith: `${typePrefix}.` };
  if (search?.trim()) where.message = { contains: search.trim(), mode: "insensitive" };

  const rows = await prisma.activity.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take: take + 1,
  });

  const hasMore = rows.length > take;
  const page = rows.slice(0, take);

  return {
    items: page.map((a) => ({
      id: a.id,
      type: a.type,
      message: a.message,
      createdAt: a.createdAt.toISOString(),
      href: buildHref(a),
    })),
    hasMore,
  };
}
