"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export type PushSubscriptionInput = { endpoint: string; p256dh: string; auth: string };

export async function savePushSubscription(data: PushSubscriptionInput) {
  const user = await getCurrentUser();
  await prisma.pushSubscription.upsert({
    where: { endpoint: data.endpoint },
    create: { userId: user.id, endpoint: data.endpoint, p256dh: data.p256dh, auth: data.auth },
    // Falls derselbe Browser sich (z.B. nach Neuinstallation) erneut mit demselben
    // endpoint meldet, aber inzwischen ein anderer Nutzer eingeloggt ist.
    update: { userId: user.id, p256dh: data.p256dh, auth: data.auth },
  });
}

export async function deletePushSubscription(endpoint: string) {
  const user = await getCurrentUser();
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
}
