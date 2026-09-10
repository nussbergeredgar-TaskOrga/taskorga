import webpush from "web-push";
import { prisma } from "@/lib/prisma";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const configured = Boolean(vapidPublicKey && vapidPrivateKey);

if (configured) {
  webpush.setVapidDetails(
    `mailto:${process.env.PLATFORM_OPERATOR_EMAIL || "kontakt@taskorga.app"}`,
    vapidPublicKey!,
    vapidPrivateKey!
  );
}

export type PushPayload = { title: string; body: string; url: string };

// Verschickt an alle Geraete/Browser, die dieser Nutzer abonniert hat (siehe
// PushSubscription, components/push-notification-toggle.tsx). Best-Effort:
// wer keine Push-Benachrichtigungen aktiviert hat, bekommt einfach keine --
// kein Fehler. Ungueltige/abgelaufene Abos (404/410 vom Push-Dienst) werden
// automatisch entfernt, sonst haeufen sich tote Eintraege an.
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!configured) return;
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  await sendToSubscriptions(subscriptions, payload);
}

// Fuer plattformweite Mitteilungen (neue Ankuendigung) -- an ALLE Nutzer mit
// mindestens einem Abo, ueber alle Firmen hinweg.
export async function sendPushToAllSubscribers(payload: PushPayload) {
  if (!configured) return;
  const subscriptions = await prisma.pushSubscription.findMany();
  await sendToSubscriptions(subscriptions, payload);
}

async function sendToSubscriptions(
  subscriptions: { id: string; endpoint: string; p256dh: string; auth: string }[],
  payload: PushPayload
) {
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error("Push-Versand fehlgeschlagen:", err);
        }
      }
    })
  );
}
