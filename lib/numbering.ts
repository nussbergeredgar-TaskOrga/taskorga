import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Ersetzt Platzhalter im konfigurierten Nummernformat, z.B.
// "ANG-{YYYY}-{NNNN}" + Sequenz 12 -> "ANG-2026-0012"
export function generateDocumentNumber(format: string, sequence: number): string {
  const year = new Date().getFullYear();
  return format
    .replace("{YYYY}", String(year))
    .replace("{YY}", String(year).slice(-2))
    .replace("{NNNN}", String(sequence).padStart(4, "0"))
    .replace("{NNN}", String(sequence).padStart(3, "0"))
    .replace("{NN}", String(sequence).padStart(2, "0"));
}

export function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

const MAX_ATTEMPTS = 5;

// Erzeugt eine Beleg-/Angebots-/Auftragsnummer und legt den Datensatz an.
// Nummern werden aus count()+1 abgeleitet statt einer atomaren DB-Sequenz —
// bei zwei gleichzeitigen Anfragen könnten beide dieselbe Nummer ermitteln.
// Statt dass die zweite dann an der @@unique([companyId, number])-Constraint
// mit einem rohen 500er scheitert, wird hier bei einer Kollision automatisch
// mit der nächsthöheren Nummer erneut versucht.
export async function createWithUniqueNumber<T>(
  model: "quote" | "invoice" | "project",
  companyId: string,
  format: string,
  create: (number: string) => Promise<T>
): Promise<T> {
  const startCount: number = await (prisma[model] as any).count({ where: { companyId } });

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const number = generateDocumentNumber(format, startCount + 1 + attempt);
    try {
      return await create(number);
    } catch (err) {
      if (!isUniqueConstraintError(err)) throw err;
      lastError = err;
    }
  }
  throw lastError;
}
