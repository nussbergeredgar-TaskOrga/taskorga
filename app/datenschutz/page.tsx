import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Datenschutzerklärung – TaskOrga",
  description: "Datenschutzerklärung von TaskOrga.",
};

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display font-semibold text-ink-900">{children}</h2>;
}

export default function DatenschutzPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-semibold text-ink-900">Datenschutzerklärung</h1>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-ink-700">
        <section>
          <H2>Verantwortlicher</H2>
          <p className="mt-1">
            Edgar Nussberger
            <br />
            In der Mudersbach 6
            <br />
            55469 Mutterschied
            <br />
            Deutschland
            <br />
            E-Mail:{" "}
            <a href="mailto:info@taskorga.de" className="text-brand-700 hover:underline">
              info@taskorga.de
            </a>
          </p>
        </section>

        <section>
          <H2>Was diese Erklärung abdeckt</H2>
          <p className="mt-1">
            Diese Erklärung betrifft die Daten, die wir über dich als Nutzer:in eines
            TaskOrga-Kontos verarbeiten (z. B. Name, E-Mail, Login-Daten). Für Daten, die dein
            Unternehmen in TaskOrga über eure eigenen Kunden erfasst (Kundendaten, Rechnungen,
            Termine etc.), handelt dein Unternehmen selbst als datenschutzrechtlich
            Verantwortlicher; TaskOrga verarbeitet diese Daten dabei als Auftragsverarbeiter im
            Sinne von Art. 28 DSGVO. Ein entsprechender Auftragsverarbeitungsvertrag (AVV) wird
            dir separat zur Verfügung gestellt.
          </p>
        </section>

        <section>
          <H2>Konto- und Registrierungsdaten</H2>
          <p className="mt-1">
            Bei der Registrierung verarbeiten wir Name, E-Mail-Adresse, Firmenname und ein
            (gehashtes) Passwort, um dein Konto anzulegen und dir Zugang zur Software zu geben.
            Rechtsgrundlage ist die Erfüllung des Nutzungsvertrags (Art. 6 Abs. 1 lit. b DSGVO).
            Passwörter werden ausschließlich als Hash gespeichert, niemals im Klartext. Optional
            kannst du eine Zwei-Faktor-Authentifizierung aktivieren.
          </p>
        </section>

        <section>
          <H2>Hosting und Infrastruktur</H2>
          <p className="mt-1">
            Die Software läuft bei Vercel Inc. mit Serverstandort Frankfurt am Main (EU). Die
            Datenbank wird bei Neon gehostet. Für den Versand von System-E-Mails (z. B.
            Registrierungsbestätigung, Passwort zurücksetzen) nutzen wir Resend, für die
            Zahlungsabwicklung von Abonnements Stripe. Mit allen genannten Dienstleistern bestehen
            bzw. werden Auftragsverarbeitungsverträge nach Art. 28 DSGVO abgeschlossen.
          </p>
        </section>

        <section>
          <H2>Cookies</H2>
          <p className="mt-1">
            Wir setzen ein technisch notwendiges Session-Cookie ein, um dich eingeloggt zu halten
            (Art. 6 Abs. 1 lit. b DSGVO) — dafür ist keine Einwilligung erforderlich, da es für den
            Betrieb der Software zwingend notwendig ist. Deine Anzeige-Einstellungen (z. B.
            Dunkelmodus, Schriftgröße) speichern wir lokal in deinem Browser (localStorage), nicht
            auf unseren Servern. Zur Messung der Ladegeschwindigkeit nutzen wir Vercel Speed
            Insights — dieser Dienst arbeitet ohne Cookies und ohne personenbezogene Daten.
          </p>
        </section>

        <section>
          <H2>Deine Rechte</H2>
          <p className="mt-1">
            Du hast das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der
            Verarbeitung deiner Daten sowie ein Recht auf Datenübertragbarkeit und Widerspruch
            gegen Verarbeitungen, die auf berechtigtem Interesse beruhen. Als Firmen-Admin kannst
            du dein Konto inkl. aller Daten jederzeit selbst unter Einstellungen → Firma
            unwiderruflich löschen. Für weitere Anfragen wende dich an{" "}
            <a href="mailto:info@taskorga.de" className="text-brand-700 hover:underline">
              info@taskorga.de
            </a>
            . Außerdem hast du das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu
            beschweren.
          </p>
        </section>
      </div>
    </div>
  );
}
