// TODO(Erik): juridisch CONCEPT (PR #161) — laat deze tekst controleren vóór er
// naar verwezen wordt in contracten; inhoudelijke claims zijn feitelijk gehouden.
// Algemene voorwaarden — NL-CONCEPT voor juridische review. ⚠️ Niet mergen
// zonder akkoord van Erik/jurist. Prijzen/trial-feiten komen uit de live
// pricing-configuratie; juridische formuleringen zijn een startpunt.

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  alternates: { canonical: '/marketing/voorwaarden' },
  title: 'Algemene voorwaarden',
  description: 'De voorwaarden voor het gebruik van Branddock.',
};

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: '1. Definities & toepasselijkheid',
    body: (
      <p>
        Deze voorwaarden gelden voor elk gebruik van Branddock, een product van BetterBrands B.V.
        (“Branddock”, “wij”). Door een account aan te maken ga je akkoord met deze voorwaarden.
      </p>
    ),
  },
  {
    title: '2. De dienst',
    body: (
      <p>
        Branddock is een SaaS-platform voor merkstrategie, onderzoek en AI-contentgeneratie. We
        leveren de dienst “as is” en werken er continu aan; functionaliteit kan wijzigen. We
        streven naar hoge beschikbaarheid maar garanderen geen ononderbroken werking.
      </p>
    ),
  },
  {
    title: '3. Proefperiode & abonnementen',
    body: (
      <ul className="list-disc pl-5 space-y-1.5">
        <li>Nieuwe accounts krijgen 28 dagen gratis toegang met een starttegoed aan credits — zonder betaalgegevens.</li>
        <li>Daarna kies je een maandabonnement (Starter, Growth of Agency). Prijzen staan op de <Link className="underline" href="/marketing/pricing">prijzenpagina</Link> en zijn exclusief btw.</li>
        <li>Abonnementen zijn maandelijks opzegbaar; upgraden of downgraden kan altijd, naar rato verrekend.</li>
        <li>Credits meten alleen gegenereerde output. Extra credits (top-ups) verlopen niet zolang je abonnement actief is.</li>
      </ul>
    ),
  },
  {
    title: '4. Betaling',
    body: (
      <p>
        Betaling verloopt via Stripe (iDEAL, SEPA-incasso of kaart). Bij uitblijvende betaling
        kunnen we de toegang tot betaalde functionaliteit opschorten nadat we je hebben
        geïnformeerd.
      </p>
    ),
  },
  {
    title: '5. Jouw content & data',
    body: (
      <ul className="list-disc pl-5 space-y-1.5">
        <li>Jij blijft eigenaar van de merkdata die je invoert én van de content die je met Branddock genereert.</li>
        <li>Wij gebruiken je workspace-inhoud alleen om de dienst aan jou te leveren — niet om AI-modellen van derden te trainen.</li>
        <li>Jij bent verantwoordelijk voor de rechtmatigheid van het materiaal dat je uploadt en voor het gebruik van gegenereerde content (inclusief controle op juistheid en claims).</li>
      </ul>
    ),
  },
  {
    title: '6. Redelijk gebruik',
    body: (
      <p>
        Het is niet toegestaan Branddock te gebruiken voor onrechtmatige content, spam, het
        schenden van rechten van derden, of het omzeilen van technische beperkingen. Bij misbruik
        kunnen we een account opschorten of beëindigen.
      </p>
    ),
  },
  {
    title: '7. Aansprakelijkheid',
    body: (
      <p>
        Onze aansprakelijkheid is beperkt tot directe schade en tot maximaal het bedrag dat je in
        de 12 maanden voorafgaand aan de schade aan Branddock hebt betaald. We zijn niet
        aansprakelijk voor indirecte schade of voor beslissingen genomen op basis van gegenereerde
        content.
      </p>
    ),
  },
  {
    title: '8. Beëindiging',
    body: (
      <p>
        Je kunt je abonnement op elk moment opzeggen; de dienst blijft beschikbaar tot het einde
        van de betaalde periode. Na beëindiging kun je je data laten exporteren; daarna verwijderen
        we workspace-inhoud conform onze{' '}
        <Link className="underline" href="/marketing/privacy">
          privacyverklaring
        </Link>
        .
      </p>
    ),
  },
  {
    title: '9. Toepasselijk recht',
    body: (
      <p>
        Op deze voorwaarden is Nederlands recht van toepassing. Geschillen worden voorgelegd aan de
        bevoegde rechter in Nederland.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="text-sm font-semibold mkt-accent uppercase tracking-wide mb-3">Juridisch</div>
      <h1 className="text-gray-900 mb-3">Algemene voorwaarden</h1>
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
