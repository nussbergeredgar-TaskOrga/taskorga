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

const REMINDER_LABELS = ["", "Zahlungserinnerung", "1. Mahnung", "2. Mahnung"];
const REMINDER_INTROS = [
  "",
  "wir möchten Sie freundlich daran erinnern, dass folgende Rechnung noch offen ist:",
  "leider konnten wir bislang keinen Zahlungseingang zu folgender Rechnung feststellen. Wir bitten Sie, den Betrag zeitnah zu begleichen:",
  "trotz unserer bisherigen Erinnerung ist folgende Rechnung weiterhin offen. Bitte gleichen Sie den Betrag umgehend aus, um weitere Schritte zu vermeiden:",
];

export async function sendPaymentReminderEmail({
  to,
  customerName,
  invoiceNumber,
  amount,
  dueDate,
  reminderLevel,
  pdfBuffer,
}: {
  to: string;
  customerName: string;
  invoiceNumber: string;
  amount: string;
  dueDate: string;
  reminderLevel: number;
  pdfBuffer: Buffer;
}) {
  if (!resend) {
    throw new Error(
      "E-Mail-Versand ist noch nicht eingerichtet. Unter Einstellungen → Firmenprofil einrichten (RESEND_API_KEY)."
    );
  }

  const label = REMINDER_LABELS[Math.min(reminderLevel, 3)] || "Zahlungserinnerung";
  const intro = REMINDER_INTROS[Math.min(reminderLevel, 3)];

  await resend.emails.send({
    from: process.env.EMAIL_FROM || "TaskOrga <onboarding@resend.dev>",
    to,
    subject: `${label}: Rechnung ${invoiceNumber}`,
    html: `
      <p>Hallo ${customerName},</p>
      <p>${intro}</p>
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
