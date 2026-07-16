// Privacyverklaring — NL-CONCEPT voor juridische review. ⚠️ Niet mergen
// zonder akkoord van Erik/jurist. Feitelijke basis (sub-verwerkers, hosting)
// komt uit de codebase; juridische formuleringen zijn een startpunt.

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacyverklaring — Branddock',
  description: 'Hoe Branddock omgaat met persoonsgegevens.',
};

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: '1. Wie zijn wij',
    body: (
      <p>
        Branddock is een product van BetterBrands B.V. (hierna: “Branddock”, “wij”). Voor vragen
        over deze verklaring of je gegevens: <a className="underline" href="mailto:hello@branddock.com">hello@branddock.com</a>.
      </p>
    ),
  },
  {
    title: '2. Welke gegevens we verwerken',
    body: (
      <ul className="list-disc pl-5 space-y-1.5">
        <li>
          <strong>Accountgegevens</strong> — naam, e-mailadres, wachtwoord (gehasht) en, bij
          social-login, je basisprofiel van die provider.
        </li>
        <li>
          <strong>Workspace-inhoud</strong> — de merkdata en content die jij of je team in
          Branddock zet (merk-DNA, persona’s, campagnes, gegenereerde output).
        </li>
        <li>
          <strong>Betaalgegevens</strong> — facturatiegegevens en betaalstatus. Kaart- en
          rekeninggegevens worden uitsluitend door Stripe verwerkt; wij slaan ze niet op.
        </li>
        <li>
          <strong>Gebruiksgegevens</strong> — productanalytics (PostHog) en foutmeldingen (Sentry)
          om Branddock te verbeteren.
        </li>
      </ul>
    ),
  },
  {
    title: '3. Waarvoor we ze gebruiken',
    body: (
      <ul className="list-disc pl-5 space-y-1.5">
        <li>Het leveren van de dienst (uitvoering van de overeenkomst).</li>
        <li>AI-generaties: jouw merkcontext gaat server-side mee in het verzoek aan de AI-provider — alleen wat nodig is voor die generatie, en niet om modellen van derden te trainen.</li>
        <li>Transactionele e-mail (accountverificatie, wachtwoord-reset, notificaties).</li>
        <li>Facturatie en wettelijke administratieplichten.</li>
        <li>Productverbetering op basis van geaggregeerd gebruik (gerechtvaardigd belang).</li>
      </ul>
    ),
  },
  {
    title: '4. Waar je data staat',
    body: (
      <p>
        De applicatie draait op Vercel in de EU (Frankfurt); de database bij Neon in een EU-regio.
        Een actuele lijst van sub-verwerkers — inclusief AI-providers — vind je op onze{' '}
        <Link className="underline" href="/marketing/security">
          Security &amp; AVG-pagina
        </Link>
        .
      </p>
    ),
  },
  {
    title: '5. Bewaartermijnen',
    body: (
      <p>
        Workspace-inhoud bewaren we zolang je account actief is. Na opzegging of verwijdering van
        een workspace verwijderen we de bijbehorende merkdata uit de actieve database.
        Factuurgegevens bewaren we conform de wettelijke bewaarplicht (7 jaar).
      </p>
    ),
  },
  {
    title: '6. Jouw rechten',
    body: (
      <p>
        Je hebt recht op inzage, rectificatie, verwijdering, beperking, dataportabiliteit en
        bezwaar. Mail <a className="underline" href="mailto:hello@branddock.com">hello@branddock.com</a>{' '}
        en we reageren binnen 1 werkdag. Je kunt ook een klacht indienen bij de Autoriteit
        Persoonsgegevens.
      </p>
    ),
  },
  {
    title: '7. Cookies',
    body: (
      <p>
        Branddock gebruikt functionele cookies (sessie, voorkeuren) en productanalytics. We
        gebruiken geen advertentie-trackers op de applicatie.
      </p>
    ),
  },
  {
    title: '8. Wijzigingen',
    body: (
      <p>
        Bij materiële wijzigingen in deze verklaring informeren we workspace-owners per e-mail.
        De actuele versie staat altijd op deze pagina.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="text-sm font-semibold mkt-accent uppercase tracking-wide mb-3">Juridisch</div>
      <h1 className="text-gray-900 mb-3">Privacyverklaring</h1>
      <p className="text-gray-500 text-sm mb-10">Versie: juli 2026</p>

      <div className="space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="text-gray-900 text-lg font-semibold mb-2">{s.title}</h2>
            <div className="text-gray-700 text-sm leading-relaxed">{s.body}</div>
          </section>
        ))}
      </div>
    </div>
  );
}
