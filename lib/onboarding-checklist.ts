import { prisma } from "@/lib/prisma";

export type ChecklistItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  // Geschaetzter Zeitbedarf in Minuten -- die Summe der offenen Schritte ergibt "noch ca. X Minuten"
  minutes: number;
  done: boolean;
  // Optionaler zweiter Weg, z.B. CSV-Import statt Einzelanlage
  altHref?: string;
  altLabel?: string;
};

// Checkliste "In 30 Minuten startklar" auf der Startseite. Der Erledigt-Stand
// wird ausschliesslich aus den echten Daten der Firma abgeleitet (kein
// gesonderter Haken), damit er nie vom tatsaechlichen Stand abweicht -- wer
// zuerst etwas anderes erledigt, sieht den Schritt direkt als erledigt.
export async function getOnboardingChecklist(companyId: string): Promise<ChecklistItem[]> {
  const [company, customers, inquiries, quotes, invoices, users, kpis] = await Promise.all([
    prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: { address: true, zip: true, city: true, taxNumber: true, vatId: true, iban: true },
    }),
    prisma.customer.count({ where: { companyId } }),
    prisma.inquiry.count({ where: { companyId } }),
    prisma.quote.count({ where: { companyId } }),
    prisma.invoice.count({ where: { companyId } }),
    prisma.user.count({ where: { companyId } }),
    prisma.customKpi.count({ where: { companyId } }),
  ]);

  const filled = (v: string | null) => !!v && v.trim().length > 0;

  return [
    {
      id: "firmendaten",
      title: "Firmendaten eintragen",
      description: "Anschrift und Steuernummer — Pflicht auf jeder Rechnung.",
      href: "/einstellungen/firma",
      minutes: 4,
      done:
        filled(company.address) &&
        filled(company.zip) &&
        filled(company.city) &&
        (filled(company.taxNumber) || filled(company.vatId)),
    },
    {
      id: "bank",
      title: "Bankverbindung hinterlegen",
      description: "Damit deine Kunden wissen, wohin sie überweisen sollen.",
      href: "/einstellungen/firma",
      minutes: 2,
      done: filled(company.iban),
    },
    {
      id: "kunden",
      title: "Kunden anlegen",
      description: "Einzeln anlegen oder auf einmal aus einer Excel-/CSV-Liste importieren.",
      href: "/kunden/neu",
      altHref: "/kunden/import",
      altLabel: "Liste importieren",
      minutes: 5,
      done: customers > 0,
    },
    {
      id: "anfrage",
      title: "Erste Anfrage erfassen",
      description: "Vom ersten Kontakt bis zum Auftrag — nichts geht mehr verloren.",
      href: "/anfragen/neu",
      minutes: 3,
      done: inquiries > 0,
    },
    {
      id: "angebot",
      title: "Erstes Angebot schreiben",
      description: "Mit deinem Logo und deinen Konditionen, direkt per E-Mail versendbar.",
      href: "/angebote/neu",
      minutes: 5,
      done: quotes > 0,
    },
    {
      id: "rechnung",
      title: "Erste Rechnung erstellen",
      description: "Inklusive E-Rechnung, wenn dein Kunde sie braucht.",
      href: "/finanzen/neu",
      minutes: 5,
      done: invoices > 0,
    },
    {
      id: "team",
      title: "Team einladen",
      description: "Mitarbeiter anlegen und Aufgaben verteilen — optional, wenn du allein arbeitest.",
      href: "/einstellungen",
      minutes: 3,
      done: users > 1,
    },
    {
      id: "kennzahl",
      title: "Eigene Kennzahl anlegen",
      description: "Zeig dir auf der Startseite genau die Zahl, die dir wichtig ist.",
      href: "/einblicke",
      minutes: 3,
      done: kpis > 0,
    },
  ];
}
