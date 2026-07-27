import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  if (!resend) {
    throw new Error(
      "E-Mail-Versand ist noch nicht eingerichtet. Bitte einen Admin bitten, das Passwort manuell zurückzusetzen (Einstellungen → Benutzerverwaltung)."
    );
  }

  await resend.emails.send({
    from: process.env.EMAIL_FROM || "TaskOrga <onboarding@resend.dev>",
    to,
    subject: "Passwort zurücksetzen – TaskOrga",
    html: `
      <p>Hallo,</p>
      <p>klicke auf den folgenden Link, um dein TaskOrga-Passwort zurückzusetzen:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>Der Link ist eine Stunde lang gültig. Falls du das nicht angefordert hast, kannst du diese E-Mail ignorieren.</p>
    `,
  });
}

export async function sendPaymentReminderEmail({
  to,
  customerName,
  invoiceNumber,
  amount,
  dueDate,
  levelLabel,
  introText,
  pdfBuffer,
}: {
  to: string;
  customerName: string;
  invoiceNumber: string;
  amount: string;
  dueDate: string;
  levelLabel: string;
  introText: string;
  pdfBuffer: Buffer;
}) {
  if (!resend) {
    throw new Error(
      "E-Mail-Versand ist noch nicht eingerichtet. Unter Einstellungen → Firmenprofil einrichten (RESEND_API_KEY)."
    );
  }

  await resend.emails.send({
    from: process.env.EMAIL_FROM || "TaskOrga <onboarding@resend.dev>",
    to,
    subject: `${levelLabel}: Rechnung ${invoiceNumber}`,
    html: `
      <p>Hallo ${customerName},</p>
      <p>${introText}</p>
      <p>
        <strong>Rechnung:</strong> ${invoiceNumber}<br/>
        <strong>Betrag:</strong> ${amount}<br/>
        <strong>Fällig seit:</strong> ${dueDate}
      </p>
      <p>Die Rechnung als PDF finden Sie im Anhang. Vielen Dank für Ihre schnelle Zahlung.</p>
    `,
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
  customerName,
  kind,
  number,
  amount,
  message,
  pdfBuffer,
}: {
  to: string;
  customerName: string;
  kind: "Angebot" | "Rechnung";
  number: string;
  amount: string;
  message?: string;
  pdfBuffer: Buffer;
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
    from: process.env.EMAIL_FROM || "TaskOrga <onboarding@resend.dev>",
    to,
    subject: `${kind} ${number}`,
    html: `
      <p>Hallo ${customerName},</p>
      <p>${message?.trim() || defaultMessage}</p>
      <p>
        <strong>${kind}:</strong> ${number}<br/>
        <strong>Betrag:</strong> ${amount}
      </p>
      <p>Die Details finden Sie im PDF im Anhang.</p>
    `,
    attachments: [
      {
        filename: `${number}.pdf`,
        content: pdfBuffer,
      },
    ],
  });
}
