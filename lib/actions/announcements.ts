"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getCurrentUserWithRole } from "@/lib/session";

export type AnnouncementItem = {
  id: string;
  type: string;
  teaser: string;
  title: string;
  body: string;
  publishedAt: Date;
};

// Fuer die Glocke im Header (components/top-bar.tsx): letzte Ankuendigungen
// plus, ob es seit dem letzten Oeffnen der Glocke etwas Neues gibt (blinkt
// dann, siehe announcementsSeenAt an User). getCurrentUserWithRole() ist per
// React.cache() dedupliziert (lib/session.ts) -- im Dashboard-Layout ohnehin
// schon aufgerufen, hier also kein zusaetzlicher DB-Roundtrip.
export async function getAnnouncementsForBell(): Promise<{ items: AnnouncementItem[]; hasUnseen: boolean }> {
  const [items, user] = await Promise.all([
    prisma.announcement.findMany({ orderBy: { publishedAt: "desc" }, take: 20 }),
    getCurrentUserWithRole(),
  ]);

  const hasUnseen = items.length > 0 && (!user.announcementsSeenAt || items[0].publishedAt > user.announcementsSeenAt);
  return { items, hasUnseen };
}

export async function markAnnouncementsSeen() {
  const user = await getCurrentUser();
  await prisma.user.update({ where: { id: user.id }, data: { announcementsSeenAt: new Date() } });
  revalidatePath("/", "layout");
}
