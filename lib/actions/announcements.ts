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
  version: string | null;
  publishedAt: Date;
};

export type LatestVersion = { version: string; publishedAt: Date } | null;

// Fuer die Glocke im Header (components/top-bar.tsx): letzte Ankuendigungen,
// ob es seit dem letzten Oeffnen der Glocke etwas Neues gibt (blinkt dann,
// siehe announcementsSeenAt an User), sowie die zuletzt veroeffentlichte
// Versions-Ankuendigung -- steuert dort, ob "Update anfordern" angezeigt wird
// (neuer als Company.updateRequestedAt) oder stattdessen der Hinweis "nutzt
// bereits die aktuellste Version". getCurrentUserWithRole() ist per
// React.cache() dedupliziert (lib/session.ts) -- im Dashboard-Layout ohnehin
// schon aufgerufen, hier also kein zusaetzlicher DB-Roundtrip.
export async function getAnnouncementsForBell(): Promise<{
  items: AnnouncementItem[];
  hasUnseen: boolean;
  latestVersion: LatestVersion;
}> {
  const [items, user, latestVersionAnnouncement] = await Promise.all([
    prisma.announcement.findMany({ orderBy: { publishedAt: "desc" }, take: 20 }),
    getCurrentUserWithRole(),
    prisma.announcement.findFirst({ where: { type: "VERSION" }, orderBy: { publishedAt: "desc" } }),
  ]);

  const hasUnseen = items.length > 0 && (!user.announcementsSeenAt || items[0].publishedAt > user.announcementsSeenAt);
  const latestVersion =
    latestVersionAnnouncement && latestVersionAnnouncement.version
      ? { version: latestVersionAnnouncement.version, publishedAt: latestVersionAnnouncement.publishedAt }
      : null;
  return { items, hasUnseen, latestVersion };
}

export async function markAnnouncementsSeen() {
  const user = await getCurrentUser();
  await prisma.user.update({ where: { id: user.id }, data: { announcementsSeenAt: new Date() } });
  revalidatePath("/", "layout");
}
