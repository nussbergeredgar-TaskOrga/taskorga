import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AVV – TaskOrga",
  description: "Auftragsverarbeitungsvertrag (Art. 28 DSGVO) von TaskOrga.",
};

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display font-semibold text-ink-900">{children}</h2>;
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="font-display font-semibold text-ink-900 mt-4">{children}</h3>;
}

export default function AvvPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-semibold text-ink-900">
        Auftragsverarbeitungsvertrag (AVV)
      </h1>
      <p className="mt-2 text-sm text-ink-500">
        gemäß Art. 28 DSGVO · Stand: 11. September 2026
      </p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-ink-700">
        <section>
          <p>
            zwischen dem Kunden als Verantwortlichem im Sinne von Art. 4 Nr. 7 DSGVO
            („Auftraggeber") und
            <br />
            TaskOrga, Inhaber: Edgar Nussberger, Am Kirchberger Weg 28, 55471 Külz
            („Auftragsverarbeiter")
          </p>
          <p className="mt-2">
            Dieser Vertrag konkretisiert die datenschutzrechtlichen Pflichten der Parteien im
            Zusammenhang mit der Verarbeitung personenbezogener Daten, die der Auftragsverarbeiter
            im Rahmen der Nutzung von TaskOrga durch den Auftraggeber im Auftrag des Auftraggebers
            verarbeitet. Er ergänzt die Allgemeinen Geschäftsbedingungen (AGB) und wird mit
            Abschluss des Hauptvertrags (Registrierung bei TaskOrga) wirksam, ohne dass es einer
            gesonderten Unterzeichnung bedarf.
          </p>
        </section>

        <section>
          <H2>1. Gegenstand und Dauer der Verarbeitung</H2>
          <p className="mt-1">
            Gegenstand der Verarbeitung ist die Speicherung und Verwaltung der vom Auftraggeber in
            TaskOrga eingegebenen Daten über seine eigenen Kunden, Interessenten, Mitarbeiter und
            Geschäftspartner (z. B. im Rahmen von Kundenverwaltung, Angeboten, Rechnungen, Terminen
            und Aufgaben). Die Verarbeitung erfolgt für die Dauer des Hauptvertrags zwischen
            Auftraggeber und Auftragsverarbeiter.
          </p>
        </section>

        <section>
          <H2>2. Art und Zweck, Daten, betroffene Personen</H2>
          <p className="mt-1">
            <strong>Zweck:</strong> Bereitstellung von TaskOrga als Software zur betrieblichen
            Verwaltung durch den Auftraggeber.
          </p>
          <p className="mt-1">
            <strong>Art der Daten:</strong> insbesondere Namen, Kontaktdaten (E-Mail, Telefon,
            Adresse), Vertrags- und Rechnungsdaten, Termine, Notizen und sonstige vom Auftraggeber
            selbst erfasste Angaben zu den betroffenen Personen.
          </p>
          <p className="mt-1">
            <strong>Kategorien betroffener Personen:</strong> Kunden, Interessenten,
            Ansprechpartner und Mitarbeiter des Auftraggebers sowie weitere Personen, deren Daten
            der Auftraggeber eigenverantwortlich in TaskOrga erfasst.
          </p>
        </section>

        <section>
          <H2>3. Verantwortlichkeit und Weisungsrecht</H2>
          <p className="mt-1">
            Der Auftraggeber bleibt datenschutzrechtlich allein verantwortlich im Sinne von Art. 4
            Nr. 7 DSGVO für die Rechtmäßigkeit der Datenerhebung und -verarbeitung sowie für die
            Wahrung der Rechte der betroffenen Personen. Der Auftragsverarbeiter verarbeitet
            personenbezogene Daten ausschließlich auf dokumentierte Weisung des Auftraggebers,
            soweit er nicht durch das Recht der Union oder der Mitgliedstaaten zu einer anderen
            Verarbeitung verpflichtet ist; die Nutzung der regulären Funktionen von TaskOrga durch
            den Auftraggeber gilt als solche Weisung.
          </p>
        </section>

        <section>
          <H2>4. Pflichten des Auftragsverarbeiters</H2>
          <p className="mt-1">Der Auftragsverarbeiter verpflichtet sich,</p>
          <ul className="mt-1 list-disc pl-5 space-y-1">
            <li>
              personenbezogene Daten ausschließlich im Rahmen dieses Vertrags und der Weisungen des
              Auftraggebers zu verarbeiten,
            </li>
            <li>
              alle Personen, die Zugang zu den Daten haben, auf Vertraulichkeit zu verpflichten,
            </li>
            <li>die technischen und organisatorischen Maßnahmen nach Ziffer 5 einzuhalten,</li>
            <li>
              den Auftraggeber bei der Erfüllung von Betroffenenanfragen (Auskunft, Berichtigung,
              Löschung, Einschränkung, Datenübertragbarkeit) im zumutbaren Umfang zu unterstützen,
            </li>
            <li>
              Verletzungen des Schutzes personenbezogener Daten nach Ziffer 7 unverzüglich zu
              melden,
            </li>
            <li>
              dem Auftraggeber alle zum Nachweis der Einhaltung dieses Vertrags erforderlichen
              Informationen zur Verfügung zu stellen und Kontrollen nach Ziffer 6 zu ermöglichen.
            </li>
          </ul>
        </section>

        <section>
          <H2>5. Technische und organisatorische Maßnahmen (TOM)</H2>
          <p className="mt-1">Der Auftragsverarbeiter trifft insbesondere folgende Maßnahmen:</p>
          <ul className="mt-1 list-disc pl-5 space-y-1">
            <li>Verschlüsselte Datenübertragung (TLS) zwischen Client und Server,</li>
            <li>Passwörter werden ausschließlich gehasht gespeichert, niemals im Klartext,</li>
            <li>optionale Zwei-Faktor-Authentifizierung für Nutzerkonten,</li>
            <li>
              Zugriff auf Produktivdaten ist auf die für den Betrieb erforderlichen Personen
              beschränkt,
            </li>
            <li>
              Hosting von Anwendung und Datenbank ausschließlich bei Dienstleistern mit
              Serverstandort in der EU (siehe Ziffer 6),
            </li>
            <li>regelmäßige, automatisierte Datensicherungen durch die Hosting-Infrastruktur,</li>
            <li>
              logisch getrennte Speicherung der Daten verschiedener Auftraggeber (Mandantentrennung
              auf Anwendungsebene).
            </li>
          </ul>
        </section>

        <section>
          <H2>6. Unterauftragsverarbeiter</H2>
          <p className="mt-1">
            Der Auftraggeber stimmt dem Einsatz folgender Unterauftragsverarbeiter zu:
          </p>
          <ul className="mt-1 list-disc pl-5 space-y-1">
            <li>Vercel Inc. – Hosting der Anwendung, Serverstandort Frankfurt am Main (EU)</li>
            <li>Neon – Hosting der Datenbank (EU)</li>
            <li>Resend – Versand von System-E-Mails</li>
            <li>Stripe – Zahlungsabwicklung der Abonnements</li>
          </ul>
          <p className="mt-2">
            Mit allen genannten Unterauftragsverarbeitern bestehen bzw. werden Verträge nach Art.
            28 DSGVO abgeschlossen, die ein Schutzniveau gewährleisten, das dem in diesem Vertrag
            vereinbarten entspricht. Der Auftragsverarbeiter informiert den Auftraggeber vorab in
            Textform (z. B. per E-Mail) über die Hinzuziehung neuer oder den Austausch bestehender
            Unterauftragsverarbeiter. Der Auftraggeber kann der Änderung innerhalb von 14 Tagen
            nach Zugang der Information aus datenschutzrechtlich relevantem Grund widersprechen;
            widerspricht er, sind beide Parteien berechtigt, den Hauptvertrag zu kündigen.
          </p>
        </section>

        <section>
          <H2>7. Meldung von Datenschutzverletzungen</H2>
          <p className="mt-1">
            Der Auftragsverarbeiter meldet dem Auftraggeber eine ihm bekannt gewordene Verletzung
            des Schutzes personenbezogener Daten, die im Rahmen dieses Vertrags verarbeitet werden,
            unverzüglich und unterstützt ihn dabei, seinen Meldepflichten gegenüber
            Aufsichtsbehörden und betroffenen Personen nach Art. 33, 34 DSGVO nachzukommen.
          </p>
        </section>

        <section>
          <H2>8. Kontrollrechte des Auftraggebers</H2>
          <p className="mt-1">
            Der Auftraggeber ist berechtigt, sich in angemessenem Umfang von der Einhaltung der in
            diesem Vertrag vereinbarten Pflichten zu überzeugen, insbesondere durch Einholung von
            Auskünften beim Auftragsverarbeiter. Vor-Ort-Kontrollen sind mit angemessenem zeitlichen
            Vorlauf anzukündigen und auf das erforderliche Maß zu beschränken.
          </p>
        </section>

        <section>
          <H2>9. Löschung und Rückgabe nach Vertragsende</H2>
          <p className="mt-1">
            Der Auftraggeber kann die in TaskOrga gespeicherten Daten jederzeit selbst unter
            Einstellungen → Firma exportieren sowie sein Konto einschließlich aller Daten
            eigenständig und unwiderruflich löschen. Nach Beendigung des Hauptvertrags bleiben die
            Daten für mindestens 30 Tage zum Export verfügbar; der Auftragsverarbeiter löscht sie
            danach automatisiert vollständig, sofern keine gesetzlichen Aufbewahrungspflichten
            entgegenstehen.
          </p>
        </section>

        <section>
          <H2>10. Haftung</H2>
          <p className="mt-1">
            Für die Haftung der Parteien gelten die gesetzlichen Regelungen, insbesondere Art. 82
            DSGVO, sowie ergänzend die Haftungsregelung in den AGB.
          </p>
        </section>

        <section>
          <H2>11. Schlussbestimmungen</H2>
          <p className="mt-1">
            Änderungen und Ergänzungen dieses Vertrags bedürfen der Textform. Bei Widersprüchen
            zwischen diesem Vertrag und den AGB gehen die Regelungen dieses Vertrags in Bezug auf
            die Verarbeitung personenbezogener Daten vor. Es gilt das Recht der Bundesrepublik
            Deutschland. Sollten einzelne Bestimmungen dieses Vertrags unwirksam sein oder werden,
            bleibt die Wirksamkeit der übrigen Bestimmungen davon unberührt.
          </p>
        </section>
      </div>
    </div>
  );
}
