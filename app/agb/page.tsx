import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AGB – TaskOrga",
  description: "Allgemeine Geschäftsbedingungen von TaskOrga.",
};

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display font-semibold text-ink-900">{children}</h2>;
}

export default function AgbPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-semibold text-ink-900">
        Allgemeine Geschäftsbedingungen (AGB)
      </h1>
      <p className="mt-2 text-sm text-ink-500">Stand: 11. September 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-ink-700">
        <section>
          <H2>1. Geltungsbereich und Vertragspartner</H2>
          <p className="mt-1">
            Diese AGB gelten für alle Verträge über die Nutzung der Software „TaskOrga" zwischen
            Edgar Nussberger, handelnd unter TaskOrga, Am Kirchberger Weg 28, 55471 Külz
            („Anbieter") und dem Kunden. Die Nutzung von TaskOrga steht ausschließlich Unternehmern
            im Sinne des § 14 BGB offen, also natürlichen oder juristischen Personen, die bei
            Abschluss des Vertrags in Ausübung ihrer gewerblichen oder selbständigen beruflichen
            Tätigkeit handeln. Verträge mit Verbrauchern im Sinne des § 13 BGB kommen nicht
            zustande. Entgegenstehende oder abweichende Bedingungen des Kunden werden nicht
            Vertragsbestandteil, es sei denn, der Anbieter stimmt ihrer Geltung ausdrücklich
            schriftlich zu.
          </p>
        </section>

        <section>
          <H2>2. Leistungsbeschreibung</H2>
          <p className="mt-1">
            TaskOrga ist eine webbasierte Software (Software as a Service) zur Verwaltung von
            Kunden, Anfragen, Angeboten, Aufgaben, Terminen und Finanzen für Selbstständige und
            kleine Unternehmen. Der genaue Funktionsumfang ergibt sich aus der jeweils aktuellen
            Ausgestaltung der Software zum Zeitpunkt der Nutzung. Der Anbieter entwickelt TaskOrga
            fortlaufend weiter und ist berechtigt, einzelne Funktionen zu ändern, zu ergänzen oder
            einzustellen, sofern der Gesamtcharakter der Software als Verwaltungssoftware für
            Selbstständige und kleine Unternehmen dadurch nicht wesentlich beeinträchtigt wird.
          </p>
        </section>

        <section>
          <H2>3. Vertragsschluss und Registrierung</H2>
          <p className="mt-1">
            Der Vertrag kommt durch die Online-Registrierung des Kunden und deren Bestätigung durch
            den Anbieter (z. B. durch Freischaltung des Kontos) zustande. Der Kunde sichert zu, dass
            die bei der Registrierung angegebenen Daten zutreffend sind und er zum Zeitpunkt der
            Registrierung als Unternehmer im Sinne von § 14 BGB handelt. Zugangsdaten sind
            vertraulich zu behandeln und dürfen nicht an Dritte weitergegeben werden; der Kunde
            haftet für alle Aktivitäten, die unter Verwendung seiner Zugangsdaten vorgenommen
            werden, es sei denn, er hat den Missbrauch nicht zu vertreten.
          </p>
        </section>

        <section>
          <H2>4. Testphase</H2>
          <p className="mt-1">
            Neue Konten erhalten eine kostenlose, unverbindliche Testphase von 14 Tagen mit vollem
            Funktionsumfang. Während der Testphase entstehen keine Kosten und es ist keine
            Zahlungsmethode erforderlich. Wird die Testphase nicht vorzeitig durch Löschung des
            Kontos beendet, geht sie nach Ablauf in ein kostenpflichtiges Abonnement gemäß Ziffer 5
            über. Zur Fortsetzung der Nutzung nach Ablauf der Testphase ist eine gültige
            Zahlungsmethode zu hinterlegen; ohne hinterlegte Zahlungsmethode kann der Zugriff auf
            die Software eingeschränkt werden.
          </p>
        </section>

        <section>
          <H2>5. Preise und Zahlungsbedingungen</H2>
          <p className="mt-1">
            Es gilt der zum Zeitpunkt der Abrechnung in der Software ausgewiesene Preis, der sich
            nach der Anzahl der aktiven Nutzerkonten der Firma richtet und sich bei Änderung der
            Nutzeranzahl automatisch anpasst. Alle Preise verstehen sich, sofern nicht anders
            ausgewiesen, netto zzgl. der jeweils gesetzlich geschuldeten Umsatzsteuer. Die
            Abrechnung erfolgt monatlich im Voraus über den Zahlungsdienstleister Stripe. Der
            Anbieter kann die Preise mit einer Ankündigungsfrist von mindestens sechs Wochen zum
            Ende eines Abrechnungszeitraums ändern; wird die Preisänderung dem Kunden rechtzeitig
            mitgeteilt und widerspricht der Kunde nicht bis zum Wirksamwerden, gilt die
            Preisänderung als angenommen. Der Anbieter weist den Kunden bei der Ankündigung
            gesondert auf diese Folge sowie auf sein Recht hin, der Änderung zu widersprechen oder
            den Vertrag zum Zeitpunkt des Wirksamwerdens der Änderung zu kündigen. Bei Zahlungsverzug
            kann der Zugriff auf die Software nach vorheriger Ankündigung eingeschränkt werden, bis
            der Rückstand ausgeglichen ist.
          </p>
        </section>

        <section>
          <H2>6. Laufzeit und Kündigung</H2>
          <p className="mt-1">
            Das Abonnement läuft nach Ablauf der Testphase auf unbestimmte Zeit und kann von beiden
            Seiten jederzeit zum Ende des laufenden Abrechnungszeitraums (Monat) gekündigt werden,
            ohne dass es eines wichtigen Grundes bedarf. Die Kündigung kann selbständig über das
            Kunden-Zahlungsportal oder in Textform (z. B. per E-Mail an{" "}
            <a href="mailto:info@taskorga.de" className="text-brand-700 hover:underline">
              info@taskorga.de
            </a>
            ) erklärt werden. Das Recht beider Seiten zur außerordentlichen Kündigung aus wichtigem
            Grund, insbesondere bei erheblichem Zahlungsverzug oder missbräuchlicher Nutzung, bleibt
            unberührt.
          </p>
        </section>

        <section>
          <H2>7. Daten des Kunden</H2>
          <p className="mt-1">
            Alle vom Kunden in TaskOrga eingegebenen Daten (u. a. Kundendaten, Angebote, Rechnungen,
            Aufgaben) bleiben Eigentum des Kunden. Der Anbieter erhält an diesen Daten lediglich die
            zur Erbringung der vertraglichen Leistung erforderlichen Nutzungs- und
            Verarbeitungsrechte. Der Kunde kann seine Daten jederzeit selbst unter Einstellungen →
            Firma exportieren sowie sein Konto einschließlich aller Daten eigenständig und
            unwiderruflich löschen. Nach Beendigung des Vertrags bleiben die Daten grundsätzlich für
            mindestens 30 Tage zum Export verfügbar; der Anbieter ist berechtigt, die Daten danach
            zu löschen, sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen. Näheres zur
            Verarbeitung personenbezogener Daten regeln die Datenschutzerklärung sowie der
            Auftragsverarbeitungsvertrag (AVV).
          </p>
        </section>

        <section>
          <H2>8. Verfügbarkeit</H2>
          <p className="mt-1">
            Der Anbieter ist bemüht, TaskOrga mit einer hohen Verfügbarkeit zu betreiben, sichert
            jedoch keine bestimmte Verfügbarkeit oder Reaktionszeit zu, sofern nicht gesondert
            schriftlich vereinbart. Wartungsarbeiten werden, soweit möglich, mit angemessenem
            Vorlauf angekündigt und auf nutzungsarme Zeiten gelegt.
          </p>
        </section>

        <section>
          <H2>9. Pflichten des Kunden</H2>
          <p className="mt-1">
            Der Kunde ist für die Rechtmäßigkeit der von ihm in TaskOrga eingegebenen Daten und
            Inhalte selbst verantwortlich und darf die Software nicht für rechtswidrige Zwecke
            nutzen. Trotz serverseitiger Datensicherung durch den Anbieter obliegt es dem Kunden,
            geschäftskritische Daten regelmäßig selbst zu exportieren. Der Kunde stellt den Anbieter
            von Ansprüchen Dritter frei, die auf einer rechtswidrigen Nutzung der Software oder
            rechtswidrigen, vom Kunden eingestellten Inhalten beruhen, soweit der Kunde dies zu
            vertreten hat.
          </p>
        </section>

        <section>
          <H2>10. Haftung</H2>
          <p className="mt-1">
            Der Anbieter haftet unbeschränkt für Vorsatz und grobe Fahrlässigkeit, für Schäden aus
            der Verletzung des Lebens, des Körpers oder der Gesundheit sowie nach den Vorschriften
            des Produkthaftungsgesetzes. Bei leicht fahrlässiger Verletzung wesentlicher
            Vertragspflichten (Kardinalpflichten), deren Erfüllung die ordnungsgemäße Durchführung
            des Vertrags überhaupt erst ermöglicht und auf deren Einhaltung der Kunde regelmäßig
            vertrauen darf, ist die Haftung auf den bei Vertragsschluss vorhersehbaren,
            vertragstypischen Schaden begrenzt, der Höhe nach maximal auf die vom Kunden in den
            zwölf Monaten vor dem schadensauslösenden Ereignis gezahlten Vergütung. Im Übrigen ist
            die Haftung für leicht fahrlässige Pflichtverletzungen ausgeschlossen. Die
            vorstehenden Haftungsbeschränkungen gelten auch zugunsten der gesetzlichen Vertreter
            und Erfüllungsgehilfen des Anbieters.
          </p>
        </section>

        <section>
          <H2>11. Änderung dieser AGB</H2>
          <p className="mt-1">
            Der Anbieter kann diese AGB mit Wirkung für die Zukunft ändern, wenn dies aus
            rechtlichen Gründen erforderlich wird oder eine Anpassung an neue oder geänderte
            Funktionen der Software notwendig macht. Die Änderung wird dem Kunden mindestens sechs
            Wochen vor ihrem Wirksamwerden in Textform mitgeteilt. Widerspricht der Kunde nicht bis
            zum Wirksamwerden, gilt die Änderung als angenommen; der Anbieter weist den Kunden bei
            der Mitteilung gesondert auf diese Folge sowie auf sein Widerspruchs- und
            Kündigungsrecht hin.
          </p>
        </section>

        <section>
          <H2>12. Schlussbestimmungen</H2>
          <p className="mt-1">
            Es gilt das Recht der Bundesrepublik Deutschland. Ausschließlicher Gerichtsstand für
            alle Streitigkeiten aus oder im Zusammenhang mit diesem Vertrag ist, soweit gesetzlich
            zulässig, der Sitz des Anbieters. Sollten einzelne Bestimmungen dieser AGB unwirksam
            sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen davon unberührt.
          </p>
        </section>
      </div>
    </div>
  );
}
