// "Brand guardrails voor AI-agents" (P2.2, wig-pagina) — de onbezette wig:
// elke agent kan content maken, geen enkele weet of het on-brand is. Copy op
// basis van het P3.4-distributiepakket (LP C); claims-grens per pilot-fval-claim
// (bescheiden, briefing-gevoelig) en zonder autonomie-beloften.

import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpenCheck, Hammer, ShieldCheck } from 'lucide-react';
import { appHref } from '../app-url';
import BookDemoButton from '../BookDemoButton';
import CopyBlock from '../CopyBlock';
import SplitHeader from '../SplitHeader';
import TrialNote from '../TrialNote';

export const metadata: Metadata = {
  alternates: { canonical: '/marketing/voor-ai-agents' },
  title: 'Brand guardrails voor AI-agents',
  description:
    'Koppel Branddock aan Claude, ChatGPT of je eigen agent-stack: merkcontext en F-VAL-validatie als guardrails, met 17 tools via de MCP-connector. Lezen en valideren is gratis.',
};

// De 17 MCP-tools, gegroepeerd op wat ze voor de agent doen. Namen zijn de
// echte tool-namen van de connector (branddock.app/mcp).
const TOOL_GROUPS: {
  Icon: typeof ShieldCheck;
  title: string;
  note: string;
  tools: string[];
}[] = [
  {
    Icon: BookOpenCheck,
    title: 'Je merk kennen',
    note: 'Gratis — kost nooit credits',
    tools: [
      'get_brand_context',
      'list_brands',
      'list_personas',
      'list_products',
      'list_competitors',
      'search_knowledge',
      'get_deliverable_content',
    ],
  },
  {
    Icon: ShieldCheck,
    title: 'Bewaken & volgen',
    note: 'Gratis — kost nooit credits',
    tools: ['score_against_brand', 'get_strategy_status', 'get_seo_status'],
  },
  {
    Icon: Hammer,
    title: 'On-brand maken',
    note: 'Credits alleen bij generatie',
    tools: [
      'generate_on_brand',
      'rewrite_on_brand',
      'generate_image',
      'generate_long_form_seo',
      'generate_web_page',
      'generate_video',
      'generate_campaign_strategy',
    ],
  },
];

// V2-09: per-platform-koppelstappen — Claude en ChatGPT hebben verschillende
// menu's; één generieke lijst dekte dat niet.
const PLATFORMS: { title: string; steps: string[] }[] = [
  {
    title: 'In Claude',
    steps: [
      // Het menu heet sinds 2026 "Customize"; oudere versies tonen "Instellingen".
      'Customize (of Instellingen) → Connectors → connector toevoegen',
      'Plak de connector-URL en bevestig',
      'Log in met je Branddock-account — je merk reist mee',
    ],
  },
  {
    title: 'In ChatGPT',
    steps: [
      // Developer mode verhuist tussen versies: Connectors → Geavanceerd, of
      // Beveiliging en inloggen. Daarom benoemd, niet als vast pad opgeschreven.
      'Zet Developer mode aan in Instellingen',
      'Connectors → toevoegen → plak dezelfde connector-URL',
      'Log in met je Branddock-account — klaar',
    ],
  },
  {
    title: 'Eigen stack (API-key)',
    steps: [
      'Maak een API-key aan in Settings → API & Connectors',
      'Gebruik de key als Bearer-token op dezelfde URL',
      'De key is merk-vergrendeld en ontsluit als enige het inladen van merkdata',
    ],
  },
];

// V2-09: drie concrete voorbeeldprompts voor de eerste 5 minuten na koppelen.
const EXAMPLE_PROMPTS: string[] = [
  'Haal mijn merkcontext op en vat samen hoe mijn merk klinkt.',
  'Schrijf een LinkedIn-post over [onderwerp] voor persona [naam] en scoor hem met de merk-check.',
  'Herschrijf deze e-mail in onze merkstem: [plak je tekst]',
];

export default function GuardrailsPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <SplitHeader
        id="guardrails-hero"
        family="proof"
        eyebrow="Voor AI-agents"
        title="Elke agent kan content maken. Geen enkele weet of het on-brand is."
        lead="Branddock is de merklaag onder je agent-stack: context erin, validatie eroverheen, en een meetbaar F-VAL-cijfer op alles wat eruit komt — welk model of platform je ook gebruikt."
        className="mb-12"
      />

      {/* V2-09: de connector-URL als kopieerbaar blok, direct onder de hero. */}
      <div className="mb-14 max-w-2xl">
        <p className="text-sm font-medium text-gray-700 mb-2">De connector-URL:</p>
        <CopyBlock value="https://branddock.app/mcp" label="Kopieer de connector-URL" />
      </div>

      {/* Het probleem */}
      <div className="max-w-2xl space-y-5 text-gray-700 leading-relaxed mb-14">
        <p>
          Agents schrijven tegenwoordig moeiteloos posts, mails en artikelen. Maar je merk zit niet
          in het model: het zit in hoofden, in een pdf die niemand opent, in het gevoel van die ene
          collega die alles herschrijft. Dus krijg je vloeiende, generieke output — en blijft de
          vraag “klinkt dit als ons?” een onderbuikgesprek.
        </p>
        <p>
          Branddock beantwoordt die vraag met een getal. Je merk-DNA — voice, persona’s, producten,
          concurrenten, do’s &amp; don’ts — wordt de context van je agent, en elke uiting krijgt een
          F-VAL-score van 0 tot 100 met concrete bevindingen. Jij keurt goed voordat iets live
          gaat.
        </p>
      </div>

      {/* De merklaag */}
      <h2 className="text-gray-900 mb-2">De merklaag: context erin, validatie eroverheen</h2>
      <p className="text-gray-600 mb-8 max-w-2xl">
        Twee dingen maken een agent merkvast — en allebei zijn ze gratis. Pas als je iets laat
        máken, kosten dat credits.
      </p>
      <div className="grid md:grid-cols-2 gap-4 mb-14">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-1">Context erin</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Eén tool-call en je agent heeft je complete merkcontext als systemcontext — dezelfde
            gelaagde context-stack die Branddock zelf in elke AI-call injecteert.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-1">Validatie eroverheen</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Laat elke tekst — van welke bron dan ook — scoren met F-VAL: composietscore 0–100,
            drempel-check en concrete bevindingen per categorie. Vóór publicatie, niet erna.
          </p>
        </div>
      </div>

      {/* De 17 tools */}
      <h2 className="text-gray-900 mb-2">17 tools via de MCP-connector</h2>
      <p className="text-gray-600 mb-8 max-w-2xl">
        Je agent krijgt de volledige Branddock-pipeline als gereedschap. Lezen en valideren is
        gratis; credits betaal je alleen voor wat je maakt.
      </p>
      <div className="grid md:grid-cols-3 gap-4 mb-14">
        {TOOL_GROUPS.map(({ Icon, title, note, tools }) => (
          <div key={title} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mkt-chip w-9 h-9 mb-3">
              <Icon className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500 mb-3">{note}</p>
            <ul className="space-y-1.5">
              {tools.map((tool) => (
                <li key={tool}>
                  <code className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">
                    {tool}
                  </code>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Koppelen — per platform (V2-09) */}
      <h2 className="text-gray-900 mb-2">Zo koppel je — per platform</h2>
      <p className="text-gray-600 mb-8 max-w-2xl">
        Zelfde connector-URL, drie routes. Voor overal waar je schrijft is er daarnaast de
        browser-extensie (beta).
      </p>
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {PLATFORMS.map(({ title, steps }) => (
          <div key={title} className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-3">{title}</h3>
            <ol className="space-y-2">
              {steps.map((s, i) => (
                <li key={s} className="flex items-start gap-2.5 text-sm text-gray-600">
                  <span className="font-bold mkt-accent tabular-nums shrink-0">{i + 1}.</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
      {/* V2-09: scopes expliciet — dít is het merkverhaal. */}
      <p className="text-sm text-gray-600 mb-14 max-w-2xl rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
        <strong className="text-gray-800">Wat mag je agent na toestemming?</strong> Je merk lezen
        en teksten scoren — gratis. Genereren kost credits en landt altijd in je
        Branddock-library. Publiceren doet de agent nooit zelf: jij keurt goed.
      </p>

      {/* Eerste prompts (V2-09) */}
      <h2 className="text-gray-900 mb-2">Eerste prompts om te proberen</h2>
      <p className="text-gray-600 mb-6 max-w-2xl">
        Direct na het koppelen — zo merk je in één minuut wat de merklaag doet.
      </p>
      <div className="space-y-3 mb-14 max-w-2xl">
        {EXAMPLE_PROMPTS.map((prompt) => (
          <div
            key={prompt}
            className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-mono text-gray-700"
          >
            {prompt}
          </div>
        ))}
      </div>

      {/* Bescheiden pilot-proof */}
      <h2 className="text-gray-900 mb-2">Wat het oplevert — eerlijk gemeten</h2>
      <div className="grid md:grid-cols-2 gap-4 mb-4 max-w-2xl">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="text-4xl font-bold mkt-accent tabular-nums">+7</div>
          <div className="text-sm text-gray-600 mt-2">
            punten on-brand gemiddeld vs. vanilla-AI, bij een eerlijke, volledige briefing
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="text-4xl font-bold mkt-accent tabular-nums">+9,5</div>
          <div className="text-sm text-gray-600 mt-2">
            punten op de nieuwsbrief — het type waar merkstem het zwaarst weegt
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-14 max-w-2xl">
        Het verschil is het grootst bij magere briefings (waar een agent niets over je merk weet)
        en bescheidener bij uitgebreide briefings. Meer over de meting:{' '}
        <Link href="/marketing/resources/f-val" className="underline hover:text-gray-600">
          F-VAL uitgelegd
        </Link>
        .
      </p>

      {/* V2-10: developer-sectie — de "API & tools"-kaart op home landt hier. */}
      <section id="api" className="scroll-mt-24 mb-14">
        <h2 className="text-gray-900 mb-2">Voor developers: API, webhooks &amp; n8n</h2>
        <p className="text-gray-600 mb-6 max-w-2xl">
          Dezelfde merklaag, machine-to-machine. Authenticatie via merk-vergrendelde API-keys
          (aanmaken in Settings → API &amp; Connectors; de key zie je één keer) of OAuth voor
          agents. Lezen en scoren is gratis; genereren kost dezelfde credits als in het platform.
        </p>
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-2">REST — merkcontext ophalen</h3>
            <pre className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs font-mono text-gray-700 overflow-x-auto">
              {`curl https://branddock.app/api/v1/brand-context \\
  -H "Authorization: Bearer bd_live_..."`}
            </pre>
            <p className="text-sm text-gray-600 mt-3">
              Naast context: <code className="text-xs">/score</code>,{' '}
              <code className="text-xs">/generate</code>, SEO-, webpagina-, beeld- en
              video-endpoints — dezelfde 17 capabilities als de MCP-tools hierboven.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Webhooks — met HMAC-verificatie</h3>
            <pre className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs font-mono text-gray-700 overflow-x-auto">
              {`x-branddock-event: deliverable.generated
x-branddock-signature: sha256=...
{ "event": "deliverable.generated",
  "workspaceId": "...",
  "data": { "deliverableId": "...",
    "contentType": "linkedin-post",
    "fidelityScore": 84 } }`}
            </pre>
            <p className="text-sm text-gray-600 mt-3">
              Events: <code className="text-xs">deliverable.generated</code>,{' '}
              <code className="text-xs">content.published</code>,{' '}
              <code className="text-xs">fidelity.scored</code> en{' '}
              <code className="text-xs">fidelity.below_threshold</code>. De signature is een
              HMAC-SHA256 over de raw body met je webhook-secret. Beheer in Settings → API &amp;
              Connectors.
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-600 max-w-2xl">
          <strong className="text-gray-800">n8n en andere workflow-tools:</strong> gebruik de
          MCP-client-node met de connector-URL hierboven, of de REST-API met een key.
          {/* TODO(Erik): aparte docs-site/API-referentie hosten (V2-10) — tot die tijd is deze
              sectie + het connectpaneel in Settings de referentie. */}{' '}
          Een uitgebreide API-referentie is in opbouw; deze sectie en het connectpaneel in
          Settings zijn tot die tijd de bron.
        </p>
      </section>

      {/* CTA */}
      <div className="pt-8 border-t border-gray-200 flex flex-wrap gap-3">
        <Link
          href={appHref('/?view=register&utm_source=marketing-site&utm_medium=guardrails')}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg mkt-btn-primary font-medium"
        >
          Start je trial en koppel je agent <ArrowRight className="w-4 h-4" />
        </Link>
        <BookDemoButton />
        <TrialNote />
      </div>
    </div>
  );
}
