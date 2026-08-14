import { Resend } from "resend";
import { renderSystemEmail, renderCompanyEmail, type SignatureCompany } from "@/lib/email-signature";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Mails an die eigenen Kunden einer Firma (Angebote, Rechnungen, Mahnungen)
// laufen technisch weiter ueber die TaskOrga-Absenderadresse (SPF/DKIM dafuer
// sind eingerichtet, eine beliebige Fremd-Domain waere das nicht), zeigen dem
// Empfaenger aber den Firmennamen als Absender an. Antworten landen per
// Reply-To direkt im Postfach der Firma, nicht bei TaskOrga.
function brandedFrom(companyName: string): string {
  const base = process.env.EMAIL_FROM || "TaskOrga <onboarding@resend.dev>";
  const address = base.match(/<(.+)>/)?.[1] ?? base;
  return `${companyName} (über TaskOrga) <${address}>`;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string, name: string) {
  if (!resend) {
    throw new Error(
      "E-Mail-Versand ist noch nicht eingerichtet. Bitte einen Admin bitten, das Passwort manuell zurückzusetzen (Einstellungen → Benutzerverwaltung)."
    );
  }

  await resend.emails.send({
    from: process.env.EMAIL_FROM || "TaskOrga <onboarding@resend.dev>",
    to,
    subject: "Passwort zurücksetzen – TaskOrga",
    html: renderSystemEmail({
      greetingName: name,
      bodyHtml: `
        <p style="margin:0 0 14px;">klicke auf den folgenden Link, um dein TaskOrga-Passwort zurückzusetzen:</p>
        <p style="margin:0 0 14px;"><a href="${resetUrl}" style="color:#2F5FFF;">${resetUrl}</a></p>
        <p style="margin:0 0 14px;">Der Link ist eine Stunde lang gültig. Falls du das nicht angefordert hast, kannst du diese E-Mail ignorieren.</p>
      `,
    }),
  });
}

export async function sendEmailVerificationEmail(to: string, verifyUrl: string, name: string) {
  if (!resend) {
    throw new Error(
      "E-Mail-Versand ist noch nicht eingerichtet. Bitte einen Admin bitten, die Adresse manuell zu bestätigen."
    );
  }

  await resend.emails.send({
    from: process.env.EMAIL_FROM || "TaskOrga <onboarding@resend.dev>",
    to,
    subject: "Bitte E-Mail-Adresse bestätigen – TaskOrga",
    html: renderSystemEmail({
      greetingName: name,
      bodyHtml: `
        <p style="margin:0 0 14px;">bitte bestätige deine E-Mail-Adresse, um dein TaskOrga-Konto vollständig zu aktivieren:</p>
        <p style="margin:0 0 14px;"><a href="${verifyUrl}" style="color:#2F5FFF;">${verifyUrl}</a></p>
        <p style="margin:0 0 14px;">Der Link ist 24 Stunden lang gültig. Falls du dieses Konto nicht erstellt hast, kannst du diese E-Mail ignorieren.</p>
      `,
    }),
  });
}

// Persoenliche Einladung aus der Plattform-Verwaltung, ein neues Firmenkonto
// mit einer selbst gewaehlten Testdauer anzulegen (siehe lib/actions/platform-admin.ts).
export async function sendPlatformInviteEmail(to: string, registerUrl: string, trialDays: number, name?: string | null) {
  if (!resend) {
    throw new Error("E-Mail-Versand ist noch nicht eingerichtet.");
  }

  await resend.emails.send({
    from: process.env.EMAIL_FROM || "TaskOrga <onboarding@resend.dev>",
    to,
    subject: "Du bist eingeladen: TaskOrga kostenlos testen",
    html: renderSystemEmail({
      greetingName: name,
      bodyHtml: `
        <p style="margin:0 0 14px;">du wurdest eingeladen, TaskOrga ${trialDays} Tage lang kostenlos zu testen.</p>
        <p style="margin:0 0 14px;"><a href="${registerUrl}" style="color:#2F5FFF;">${registerUrl}</a></p>
        <p style="margin:0 0 14px;">Der Link ist 14 Tage lang gültig. Beim Registrieren legst du dein eigenes, komplett von anderen Firmen getrenntes Konto an.</p>
      `,
    }),
  });
}

export async function sendTeamInviteEmail({
  to,
  name,
  company,
  loginUrl,
}: {
  to: string;
  name: string;
  company: SignatureCompany;
  loginUrl: string;
}) {
  if (!resend) {
    throw new Error(
      "E-Mail-Versand ist noch nicht eingerichtet. Bitte der Person Login-Daten manuell mitteilen."
    );
  }

  await resend.emails.send({
    from: process.env.EMAIL_FROM || "TaskOrga <onboarding@resend.dev>",
    to,
    subject: `Dein TaskOrga-Zugang für ${company.name}`,
    html: renderSystemEmail({
      greetingName: name,
      bodyHtml: `
        <p style="margin:0 0 14px;">für dich wurde ein TaskOrga-Konto für <strong>${company.name}</strong> angelegt.</p>
        <p style="margin:0 0 14px;">Melde dich mit dieser E-Mail-Adresse und dem Startpasswort an, das dir von deinem Admin mitgeteilt wurde:</p>
        <p style="margin:0 0 14px;"><a href="${loginUrl}" style="color:#2F5FFF;">${loginUrl}</a></p>
        <p style="margin:0 0 14px;">Falls du kein Startpasswort erhalten hast, kannst du auf der Login-Seite über „Passwort vergessen?“ selbst eines vergeben.</p>
      `,
    }),
  });
}

export async function sendPaymentReminderEmail({
  to,
  greeting,
  invoiceNumber,
  amount,
  dueDate,
  levelLabel,
  introText,
  pdfBuffer,
  company,
}: {
  to: string;
  greeting: string;
  invoiceNumber: string;
  amount: string;
  dueDate: string;
  levelLabel: string;
  introText: string;
  pdfBuffer: Buffer;
  company: SignatureCompany;
}) {
  if (!resend) {
    throw new Error(
      "E-Mail-Versand ist noch nicht eingerichtet. Unter Einstellungen → Firmenprofil einrichten (RESEND_API_KEY)."
    );
  }

  await resend.emails.send({
    from: brandedFrom(company.name),
    replyTo: company.email || undefined,
    to,
    subject: `${levelLabel}: Rechnung ${invoiceNumber}`,
    html: renderCompanyEmail({
      company,
      greetingLine: greeting,
      bodyHtml: `
        <p style="margin:0 0 14px;">${introText}</p>
        <p style="margin:0 0 14px;">
          <strong>Rechnung:</strong> ${invoiceNumber}<br/>
          <strong>Betrag:</strong> ${amount}<br/>
          <strong>Fällig seit:</strong> ${dueDate}
        </p>
        <p style="margin:0 0 14px;">Die Rechnung als PDF finden Sie im Anhang. Vielen Dank für Ihre schnelle Zahlung.</p>
      `,
    }),
    attachments: [
      {
        filename: `${invoiceNumber}.pdf`,
        content: pdfBuffer,
      },
    ],
  });
}

export async function sendDocumentEmail({
  to,
  greeting,
  kind,
  number,
  amount,
  message,
  pdfBuffer,
  company,
}: {
  to: string;
  greeting: string;
  kind: "Angebot" | "Rechnung";
  number: string;
  amount: string;
  message?: string;
  pdfBuffer: Buffer;
  company: SignatureCompany;
}) {
  if (!resend) {
    throw new Error(
      "E-Mail-Versand ist noch nicht eingerichtet. Unter Einstellungen → Firmenprofil einrichten (RESEND_API_KEY)."
    );
  }

  const defaultMessage =
    kind === "Angebot"
      ? "anbei erhalten Sie unser Angebot. Bei Fragen melden Sie sich gerne."
      : "anbei erhalten Sie unsere Rechnung. Vielen Dank für Ihr Vertrauen.";

  await resend.emails.send({
    from: brandedFrom(company.name),
    replyTo: company.email || undefined,
    to,
    subject: `${kind} ${number}`,
    html: renderCompanyEmail({
      company,
      greetingLine: greeting,
      bodyHtml: `
        <p style="margin:0 0 14px;">${message?.trim() || defaultMessage}</p>
        <p style="margin:0 0 14px;">
          <strong>${kind}:</strong> ${number}<br/>
          <strong>Betrag:</strong> ${amount}
        </p>
        <p style="margin:0 0 14px;">Die Details finden Sie im PDF im Anhang.</p>
      `,
    }),
    attachments: [
      {
        filename: `${number}.pdf`,
        content: pdfBuffer,
      },
    ],
  });
}
