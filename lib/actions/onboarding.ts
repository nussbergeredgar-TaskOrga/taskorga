"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// "Fire and forget" von der Tour aufgerufen -- im schlimmsten Fall (Schreibfehler)
// beginnt die Tour nach einem Reload einen Schritt frueher erneut, kein Schaden.
export async function advanceOnboardingStep(step: number) {
  const user = await getCurrentUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { onboardingStep: step },
  });
}

// Wird von der Tour awaited, bevor die Overlay-UI verschwindet -- ein stiller
// Fehler hier wuerde den Nutzer sonst dauerhaft in der Pflicht-Tour gefangen
// halten, deshalb ein einmaliger automatischer Retry vor dem Aufgeben.
export async function completeOnboarding() {
  const user = await getCurrentUser();
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { onboardingCompletedAt: new Date() },
    });
  } catch {
    await prisma.user.update({
      where: { id: user.id },
      data: { onboardingCompletedAt: new Date() },
    });
  }
}
