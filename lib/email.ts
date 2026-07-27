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
