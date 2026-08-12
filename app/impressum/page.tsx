import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impressum – TaskOrga",
  description: "Impressum von TaskOrga gemäß § 5 DDG.",
};

export default function ImpressumPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-semibold text-ink-900">Impressum</h1>
      <p className="mt-2 text-sm text-ink-500">Angaben gemäß § 5 DDG</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-ink-700">
        <section>
          <p>
            Edgar Nussberger
            <br />
            In der Mudersbach 6
            <br />
            55469 Mutterschied
            <br />
            Deutschland
          </p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-ink-900">Kontakt</h2>
          <p className="mt-1">
            E-Mail:{" "}
            <a href="mailto:info@taskorga.de" className="text-brand-700 hover:underline">
              info@taskorga.de
            </a>
          </p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-ink-900">
            Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
          </h2>
          <p className="mt-1">Edgar Nussberger (Anschrift wie oben)</p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-ink-900">Streitschlichtung</h2>
          <p className="mt-1">
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
            <a
              href="https://ec.europa.eu/consumers/odr/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-700 hover:underline"
            >
              ec.europa.eu/consumers/odr
            </a>
            . Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
            Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </section>
      </div>
    </div>
  );
}
