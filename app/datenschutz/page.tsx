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
      <p className="mt-2 text-sm text-ink-500">Stand: 11. September 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-ink-700">
        <section>
          <H2>Verantwortlicher</H2>
          <p className="mt-1">
            TaskOrga, Inhaber: Edgar Nussberger
            <br />
            Am Kirchberger Weg 28
            <br />
            55471 Külz
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
            Sinne von Art. 28 DSGVO. Die Einzelheiten regelt der{" "}
            <a href="/avv" className="text-brand-700 hover:underline">
              Auftragsverarbeitungsvertrag (AVV)
            </a>
            .
          </p>
        </section>

        <section>
          <H2>Konto- und Registrierungsdaten</H2>
          <p className="mt-1">
            Bei der Registrierung verarbeiten wir Name, E-Mail-Adresse, Firmenname und ein
            (gehashtes) Passwort, um dein Konto anzulegen und dir Zugang zur Software zu geben.
            Rechtsgrundlage ist die Erfüllung des Nutzungsvertrags (Art. 6 Abs. 1 lit. b DSGVO).
            Passwörter werden ausschließlich als Hash gespeichert, niemals im Klartext. Optional
            kannst du eine Zwei-Faktor-Authentifizierung aktivieren; dabei speichern wir ein
            TOTP-Geheimnis sowie einmal verwendbare Backup-Codes, um deinen Login zusätzlich
            abzusichern.
          </p>
        </section>

        <section>
          <H2>IP-Adressen bei der Registrierung</H2>
          <p className="mt-1">
            Bei einer Registrierung speichern wir vorübergehend die IP-Adresse des jeweiligen
            Versuchs, um automatisiertes Durchprobieren von Einladungscodes zu erkennen und zu
            bremsen (Art. 6 Abs. 1 lit. f DSGVO, berechtigtes Interesse an der Sicherheit unserer
            Registrierung). Diese Einträge werden nach 24 Stunden automatisch gelöscht.
          </p>
        </section>

        <section>
          <H2>Push-Benachrichtigungen</H2>
          <p className="mt-1">
            Wenn du Push-Benachrichtigungen in deinem Browser aktivierst, speichern wir dafür
            einen geräte- bzw. browserspezifischen Endpunkt samt Verschlüsselungsschlüssel, um dir
            Benachrichtigungen (z. B. zugewiesene Aufgaben, Termine) zusenden zu können.
            Rechtsgrundlage ist deine Einwilligung, die du bei der Aktivierung über die
            Berechtigungsabfrage deines Browsers erteilst (Art. 6 Abs. 1 lit. a DSGVO) und die du
            jederzeit unter Einstellungen → Mein Konto widerrufen kannst.
          </p>
        </section>

        <section>
          <H2>Abonnement und Zahlungsdaten</H2>
          <p className="mt-1">
            Für die Abrechnung deines TaskOrga-Abonnements übermitteln wir Name, E-Mail-Adresse
            und Firmenname an unseren Zahlungsdienstleister Stripe. Deine Zahlungsmethode (z. B.
            Kreditkartendaten) wird ausschließlich bei Stripe verarbeitet und läuft nicht über
            unsere eigenen Server. Rechtsgrundlage ist die Erfüllung des Nutzungsvertrags (Art. 6
            Abs. 1 lit. b DSGVO). Aus dem Abonnement-Verhältnis entstehende Rechnungsdaten
            bewahren wir entsprechend handels- und steuerrechtlicher Aufbewahrungsfristen (i. d.
            R. zehn Jahre) auf.
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
          <H2>Übermittlung in die USA</H2>
          <p className="mt-1">
            Vercel Inc., Resend und Stripe, Inc. haben ihren Sitz in den USA. Auch wenn die
            eigentliche Anwendung und Datenbank auf Servern in der EU laufen, ist damit im Einzelfall
            eine Übermittlung personenbezogener Daten in ein Drittland verbunden. Diese erfolgt auf
            Grundlage von EU-Standardvertragsklauseln (Art. 46 DSGVO) und, soweit der jeweilige
            Anbieter zertifiziert ist, zusätzlich auf Grundlage des EU-US Data Privacy Framework.
          </p>
        </section>

        <section>
          <H2>Speicherdauer</H2>
          <p className="mt-1">
            Konto- und Nutzungsdaten speichern wir für die Dauer des Vertrags. Nach Kündigung
            bleiben sie für mindestens 30 Tage zum Export verfügbar und werden danach
            automatisiert unwiderruflich gelöscht, sofern keine gesetzlichen
            Aufbewahrungspflichten entgegenstehen. Dein Konto kannst du als Admin jederzeit auch
            selbst und sofort unter Einstellungen → Firma löschen. IP-Adressen aus
            Registrierungsversuchen löschen wir nach 24 Stunden (siehe oben).
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
            Schriftarten werden über next/font beim Build selbst gehostet und beim Seitenaufruf
            nicht live von Google-Servern nachgeladen.
          </p>
        </section>

        <section>
          <H2>Deine Rechte</H2>
          <p className="mt-1">
            Du hast das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der
            Verarbeitung deiner Daten sowie ein Recht auf Datenübertragbarkeit und Widerspruch
            gegen Verarbeitungen, die auf berechtigtem Interesse beruhen; erteilte Einwilligungen
            (z. B. für Push-Benachrichtigungen) kannst du jederzeit mit Wirkung für die Zukunft
            widerrufen. Als Firmen-Admin kannst du dein Konto inkl. aller Daten jederzeit selbst
            unter Einstellungen → Firma unwiderruflich löschen. Für weitere Anfragen wende dich an{" "}
            <a href="mailto:info@taskorga.de" className="text-brand-700 hover:underline">
              info@taskorga.de
            </a>
            . Außerdem hast du das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu
            beschweren, zuständig ist für uns die Landesbeauftragte für den Datenschutz und die
            Informationsfreiheit Rheinland-Pfalz.
          </p>
        </section>
      </div>
    </div>
  );
}
