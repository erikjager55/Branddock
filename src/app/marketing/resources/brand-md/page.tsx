// "brand.md uitgelegd" — cornerstone-artikel bij de gratis generator (/brandmd).
// Legt het formaat uit, plaatst het naast llms.txt en AGENTS.md, en is expliciet
// over twee dingen die het merk dragen: we omarmen een bestaande standaard (we
// bezitten hem niet) en het verdienmodel wordt benoemd in plaats van verstopt.
// Volgt het patroon van resources/f-val.

import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ChevronDown, FileText, Globe, Terminal } from 'lucide-react';
import { appHref } from '../../app-url';
import Mosaic, { MOSAIC_PRODUCT } from '../../Mosaic';
import SplitHeader from '../../SplitHeader';
import TrialNote from '../../TrialNote';

export const metadata: Metadata = {
  alternates: { canonical: '/marketing/resources/brand-md' },
  title: 'brand.md uitgelegd: het open bestand dat AI je merk laat kennen',
  description:
    'brand.md is een open standaard (MIT, spec 0.3.0) die je merk in één markdown-bestand zet, zodat ChatGPT, Claude en elke andere AI-tool niet bij nul beginnen. Uitleg, opbouw en een gratis generator.',
};

const TRIAD = [
  {
    Icon: Globe,
    file: 'llms.txt',
    what: 'Je site voor AI',
    body: 'Vertelt een taalmodel welke pagina’s van je website ertoe doen en waar ze staan.',
  },
  {
    Icon: Terminal,
    file: 'AGENTS.md',
    what: 'Je repo voor AI',
    body: 'Vertelt een code-agent hoe jouw project in elkaar zit: commando’s, conventies, grenzen.',
  },
  {
    Icon: FileText,
    file: 'brand.md',
    what: 'Je merk voor AI',
    body: 'Vertelt élke AI-tool wie je bent: waar je voor staat, hoe je klinkt en hoe je eruitziet.',
  },
];

const SECTIONS = [
  {
    title: 'Strategy',
    core: true,
    body: 'Waar het merk voor staat: positionering, persoonlijkheid, belofte, doelgroep en guardrails.',
  },
  {
    title: 'Voice',
    core: true,
    body: 'Hoe het merk klinkt: toon, woorden die je wél en niet gebruikt, voorbeeldzinnen uit je eigen teksten.',
  },
  {
    title: 'Visual',
    core: true,
    body: 'Hoe het merk eruitziet: kleuren met hun hex-waarden, lettertypen, beeldrichting.',
  },
  {
    title: 'Audience',
    core: false,
    body: 'Je persona’s als losse blokken, zodat een agent voor de juiste lezer kan schrijven.',
  },
  {
    title: 'Products & Services',
    core: false,
    body: 'Wat je aanbiedt, met de voordelen en gebruikssituaties per product.',
  },
  {
    title: 'Guardrails',
    core: false,
    body: 'Do’s en don’ts als machine-leesbare lijsten, zodat een tool ze kan controleren in plaats van interpreteren.',
  },
];

// Overgenomen uit de long-form-pipeline (de vraagvormen kwamen daar vandaan);
// de antwoorden zijn hier herschreven op geverifieerde feiten. De pipeline-versie
// bevatte drie cijfers zonder bron en zes interne links die 404 gaven.
const FAQ = [
  {
    q: 'Wat is brand.md?',
    a: 'Een markdown-bestand dat je merk beschrijft in een vaste structuur, zodat een taalmodel het kan lezen voordat het schrijft. Het is een open standaard onder MIT-licentie; de spec staat op versie 0.3.0.',
  },
  {
    q: 'Wat is het verschil met AGENTS.md en llms.txt?',
    a: 'Ze doen alle drie iets anders. AGENTS.md vertelt een code-agent hoe je project werkt. llms.txt vertelt een taalmodel welke pagina’s van je site ertoe doen. brand.md vertelt elke AI-tool hoe je merk klinkt en denkt. Ze zijn geen concurrenten en kunnen naast elkaar bestaan.',
  },
  {
    q: 'Wat hoort er in het bestand?',
    a: 'De standaard vraagt Strategy, Voice en Visual. Het meest sturende onderdeel zijn concrete voorbeeldzinnen: een model leert sneller van een goede en een foute zin naast elkaar dan van een abstracte omschrijving als “wees authentiek”.',
  },
  {
    q: 'Heb ik Branddock nodig om brand.md te gebruiken?',
    a: 'Nee. Het formaat is open, het bestand is van jou en je kunt het met de hand schrijven of door een andere tool laten maken. Onze generator neemt je het lege blad uit handen; ons abonnement zorgt dat het bestand bijblijft.',
  },
  {
    q: 'Wat kost de generator?',
    a: 'Niets, en er is geen account voor nodig. Voor het uitgebreide rapport bij je scan vragen we een e-mailadres. Het bestand zelf kun je zonder e-mail downloaden.',
  },
  {
    q: 'Hoe blijft het bestand actueel?',
    a: 'Dat is de zwakke plek van elk gedownload bestand: het verandert niet mee als je merk verandert. Zet een vaste controle in je agenda, of laat de levende versie in Branddock meebewegen met je merk-DNA.',
  },
];

export default function BrandMdPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <SplitHeader
        id="brandmd-hero"
        family="product"
        eyebrow="Uitgelegd"
        title="brand.md: je merk in één bestand dat elke AI-tool leest"
        lead="Elke AI-tool begint bij nul over je merk. brand.md is het open bestand dat daar een eind aan maakt. De generator ervoor is gratis."
        className="mb-12"
      />

      {/* Het probleem */}
      <div className="prose-like max-w-2xl space-y-5 text-gray-700 leading-relaxed mb-14">
        <p>
          Je schrijft een nieuwsbrief in ChatGPT, laat Claude een campagne-opzet maken, vraagt een
          beeldmodel om een visual en je collega beantwoordt e-mail met een AI-assistent. Vier
          tools, vier keer opnieuw uitleggen wie je bent. En omdat niemand die uitleg twee keer
          identiek geeft, klinkt je merk in elk kanaal net even anders.
        </p>
        <p>
          Dat is geen tijdprobleem maar een consistentieprobleem. De uitleg zit in de
          chatgeschiedenis van één persoon, niet in het merk. Zodra die persoon met vakantie is,
          begint de volgende weer bij nul.
        </p>
      </div>

      {/* Wat het is */}
      <h2 className="text-gray-900 mb-2">Wat brand.md is</h2>
      <div className="prose-like max-w-2xl space-y-5 text-gray-700 leading-relaxed mb-10">
        <p>
          brand.md is één markdown-bestand: platte tekst, leesbaar voor een mens én voor een
          taalmodel, dat je merk beschrijft. Je zet het in de root van je project, naast{' '}
          <code className="text-sm">README.md</code>, of je plakt de inhoud in een chat. Er is geen
          integratie voor nodig: elk model dat tekst leest, leest dit bestand.
        </p>
        <p>
          <strong>Het formaat is niet van ons.</strong> brand.md is een open standaard onder
          MIT-licentie, bedacht door Caio Pizzol; de spec staat op versie 0.3.0 en is openbaar op{' '}
          <a
            href="https://github.com/caiopizzol/brand.md"
            target="_blank"
            rel="noopener noreferrer"
            className="mkt-accent underline underline-offset-2"
          >
            GitHub
          </a>
          . Wij bouwden er de tooling omheen.
        </p>
      </div>

      {/* De drie-eenheid */}
      <p className="text-gray-600 mb-6 max-w-2xl">
        Het bestand hoort in een rijtje thuis dat je misschien al kent:
      </p>
      <div className="grid sm:grid-cols-3 gap-4 mb-14">
        {TRIAD.map(({ Icon, file, what, body }) => (
          <div key={file} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mkt-tile mb-3">
              <Mosaic
                id={`brandmd-tile-${file}`}
                cols={2}
                rows={2}
                palette={MOSAIC_PRODUCT}
                className="absolute inset-0 w-full h-full"
              />
              <div className="mkt-tile__badge">
                <i>
                  <Icon className="w-3.5 h-3.5" style={{ color: 'var(--brand-slate)' }} />
                </i>
              </div>
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              <code className="text-sm">{file}</code>
            </h3>
            <div className="text-sm font-medium mkt-accent mb-1">{what}</div>
            <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
          </div>
        ))}
      </div>

      {/* Wat erin staat */}
      <h2 className="text-gray-900 mb-2">Wat er in het bestand staat</h2>
      <p className="text-gray-600 mb-8 max-w-2xl">
        De standaard schrijft drie secties voor. Branddock voegt er drie toe die je nodig hebt
        zodra een agent écht werk voor je doet. Die uitbreidingen zijn additief: een tool die ze
        niet kent, slaat ze over en houdt een geldig bestand over.
      </p>
      <div className="grid sm:grid-cols-2 gap-4 mb-14">
        {SECTIONS.map(({ title, core, body }) => (
          <div key={title} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-semibold text-gray-900">{title}</h3>
              <span className="mkt-chip">{core ? 'standaard' : 'Branddock'}</span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
          </div>
        ))}
      </div>

      {/* Inline CTA — conversiemoment halverwege: de lezer weet nu wát er in het
          bestand hoort, dus "laat er een maken van jouw site" landt hier het best. */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 mb-14 max-w-2xl">
        <h3 className="text-base font-semibold text-gray-900 mb-1">
          Benieuwd wat er van jouw merk in komt te staan?
        </h3>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
          Plak je URL en je krijgt je eigen brand.md, met per sectie eerlijk aangegeven wat een
          scan wel en niet kon bevestigen.
        </p>
        <Link
          href="/brandmd"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg mkt-btn-primary text-sm font-medium"
        >
          Genereer je brand.md <ArrowRight className="w-4 h-4" />
        </Link>
        <p className="text-sm text-gray-500 mt-2">Gratis · geen account nodig</p>
      </div>

      {/* Waarom omarmen */}
      <h2 className="text-gray-900 mb-2">Waarom we een bestaande standaard omarmen</h2>
      <div className="prose-like max-w-2xl space-y-5 text-gray-700 leading-relaxed mb-14">
        <p>
          We hadden een eigen formaat kunnen lanceren. Dat hebben we bewust niet gedaan, en de
          reden staat in twee recente voorbeelden.
        </p>
        <p>
          <strong>llms.txt</strong> liet zien hoe het misgaat. Veel sites publiceerden er een, en dat telde als
          adoptie. Tot iemand naar de leeskant keek: de grote crawlers doen er nauwelijks iets
          mee. Een formaat met alleen
          schrijvers en zonder lezers is een dode letter.
        </p>
        <p>
          <strong>MCP</strong> liet zien hoe het wél gaat. Dat protocol won niet door schrijvers te
          werven, maar door de leeskant op dag één te leveren: Claude las het meteen. De rest
          volgde.
        </p>
        <p>
          Twee concurrerende formaten onder dezelfde naam zouden allebei verliezen. Dus adopteren
          we de bestaande spec als kern, publiceren we onze uitbreidingen als aanvulling, en dienen
          we de algemeen nuttige stukken upstream in. Wat wij toevoegen is de tooling: een
          generator, een validator en een levende versie.
        </p>
      </div>

      {/* Eerlijkheid */}
      <h2 className="text-gray-900 mb-2">Wat een scan niet kan weten</h2>
      <p className="text-gray-600 mb-8 max-w-2xl">
        Een scan van je website kan niets verifiëren. Hij leest wat er staat en leidt de rest af.
        Dat is precies waar een generator de neiging heeft om overtuigend te gaan liegen, dus dit
        zijn de drie regels waar we ons aan houden:
      </p>
      <div className="space-y-4 max-w-2xl mb-14">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-1">
            Wat niet bevestigd is, heet <code className="text-sm">unvalidated</code>
          </h3>
          <p className="text-sm text-gray-600">
            Elke sectie die een website alleen niet kan bevestigen, krijgt dat label in de
            frontmatter. Je ziet dus in het bestand zelf welk deel een aanname is.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-1">
            Ontbrekend blijft ontbrekend
          </h3>
          <p className="text-sm text-gray-600">
            Een verplichte sectie waarvoor geen gegevens zijn, zegt “Not yet defined” in plaats van
            een geloofwaardig ingevulde alinea. In ons eigen bestand staat dat op dit moment bij
            Positioning. We laten het staan.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-1">
            De Brand Score is uitrekenbaar
          </h3>
          <p className="text-sm text-gray-600">
            Je krijgt een score met drie uitlegbare checks: compleetheid, consistentie en
            leesbaarheid voor een model. Geen AI die een cijfer geeft dat niemand kan navertellen.
          </p>
        </div>
      </div>

      {/* Verdienmodel */}
      <h2 className="text-gray-900 mb-2">Gratis bestand, betaald onderhoud</h2>
      <div className="prose-like max-w-2xl space-y-5 text-gray-700 leading-relaxed mb-14">
        <p>
          De generator is gratis en blijft gratis. Je plakt je URL, je krijgt je brand.md, je
          downloadt het en je bent klaar. Geen account nodig. We vragen je e-mailadres voor het
          uitgebreide rapport, niet voor het bestand. Dat zeggen we liever hier dan dat je het
          onderweg ontdekt.
        </p>
        <p>
          Wat we verkopen is dat het bestand bijblijft. Een gedownload bestand veroudert stil: je
          herpositioneert, je voice verandert, je lanceert een product, en het bestand dat je
          agents lezen weet daar niets van. In Branddock is je brand.md een levende versie met een vaste
          URL, die meebeweegt met je merk-DNA en die je agents via de{' '}
          <Link href="/marketing/voor-ai-agents" className="mkt-accent underline underline-offset-2">
            MCP-koppeling
          </Link>{' '}
          altijd actueel ophalen. De velden <code className="text-sm">validation:</code> en{' '}
          <code className="text-sm">provenance:</code> in de spec kunnen alleen daar betekenis
          krijgen: ze vertellen wie wat wanneer heeft bevestigd, en waar de actuele versie staat.
        </p>
        <p>
          Dat is het hele model. Het formaat is open, het bestand is van jou, en je hebt ons niet
          nodig om het te gebruiken.
        </p>
      </div>

      {/* Wat het niet oplost */}
      <h2 className="text-gray-900 mb-2">Wat brand.md niet oplost</h2>
      <div className="prose-like max-w-2xl space-y-5 text-gray-700 leading-relaxed mb-14">
        <p>
          Een brand.md legt vast hoe je merk klinkt. Het bepaalt niet of een campagne een goed idee
          is, of een boodschap klopt, of een moment het juiste is. Dat blijft mensenwerk, en dat
          verandert niet als het bestand beter wordt.
        </p>
        <p>
          Het bestand veroudert bovendien stil. Verandert je merk en het bestand niet, dan schrijft
          elke tool keurig in de toon die je een jaar geleden had. Dat is geen fout in het formaat;
          het is de reden dat onderhoud erbij hoort.
        </p>
      </div>

      {/* FAQ */}
      <h2 className="text-gray-900 mb-6">Veelgestelde vragen</h2>
      <div className="divide-y divide-gray-200 border-t border-gray-200 max-w-2xl mb-14">
        {FAQ.map(({ q, a }) => (
          <details key={q} className="group py-4">
            <summary className="flex cursor-pointer items-center justify-between gap-3 text-gray-900 font-medium list-none">
              {q}
              <ChevronDown className="w-5 h-5 mkt-accent shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <p className="text-gray-600 text-sm mt-3 leading-relaxed">{a}</p>
          </details>
        ))}
      </div>
      {/* FAQPage-JSON-LD: zelfde patroon als de JSON-LD in de marketing-layout. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQ.map(({ q, a }) => ({
              '@type': 'Question',
              name: q,
              acceptedAnswer: { '@type': 'Answer', text: a },
            })),
          }),
        }}
      />

      {/* CTA — twee paden, elk met de microcopy die er echt bij hoort.
          De trial-regel hoort bij het betaalde pad, niet bij de gratis generator. */}
      <div className="pt-8 border-t border-gray-200">
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <Link
              href="/brandmd"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg mkt-btn-primary font-medium"
            >
              Genereer je brand.md <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="text-sm text-gray-500 mt-2">Gratis · geen account nodig</p>
          </div>
          <div>
            <Link
              href={appHref(
                '/?view=register&utm_source=marketing-site&utm_medium=brandmd-explainer'
              )}
              className="inline-flex items-center px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
            >
              Houd het levend in Branddock
            </Link>
            <TrialNote className="mt-2" />
          </div>
        </div>
        <p className="mt-6 text-sm">
          <Link href="/brandmd/use" className="mkt-accent underline underline-offset-2">
            Zo gebruik je het in Claude en ChatGPT
          </Link>
        </p>
      </div>
    </div>
  );
}
