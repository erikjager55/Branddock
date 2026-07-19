// "Brand guardrails voor AI-agents" (P2.2, wig-pagina) — de onbezette wig:
// elke agent kan content maken, geen enkele weet of het on-brand is. Copy op
// basis van het P3.4-distributiepakket (LP C); claims-grens per pilot-fval-claim
// (bescheiden, briefing-gevoelig) en zonder autonomie-beloften.

import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpenCheck, Hammer, ShieldCheck } from 'lucide-react';
import { appHref } from '../app-url';
import BookDemoButton from '../BookDemoButton';
import SplitHeader from '../SplitHeader';
import TrialNote from '../TrialNote';

export const metadata: Metadata = {
  alternates: { canonical: '/marketing/guardrails' },
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

const CONNECT_STEPS: { step: string; title: string; body: string }[] = [
  {
    step: '1',
    title: 'Plak de connector-URL',
    body: 'Voeg in Claude of ChatGPT een connector toe met https://branddock.app/mcp.',
  },
  {
    step: '2',
    title: 'Log in met je Branddock-account',
    body: 'De OAuth-login opent vanzelf — inloggen, workspace kiezen, toestemming geven.',
  },
  {
    step: '3',
    title: 'Klaar — je agent kent je merk',
    body: 'Vraag om context, laat teksten scoren of genereer on-brand. Alles landt gescoord in je Branddock-library.',
  },
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

      {/* Koppelen in 3 stappen */}
      <h2 className="text-gray-900 mb-2">Gekoppeld in drie stappen</h2>
      <p className="text-gray-600 mb-8 max-w-2xl">
        Werkt in Claude én ChatGPT. Voor eigen agent-stacks is er dezelfde connector met een
        API-key, en voor overal waar je schrijft de browser-extensie (beta).
      </p>
      <div className="grid md:grid-cols-3 gap-4 mb-14">
        {CONNECT_STEPS.map(({ step, title, body }) => (
          <div key={step} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="text-2xl font-bold mkt-accent tabular-nums mb-2">{step}</div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
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
          <div className="text-4xl font-bold mkt-accent tabular-nums">+12</div>
          <div className="text-sm text-gray-600 mt-2">
            punten op de nieuwsbrief — het type waar merkstem het zwaarst weegt
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-14 max-w-2xl">
        Het verschil is het grootst bij magere briefings (waar een agent niets over je merk weet)
        en bescheidener bij uitgebreide briefings. Meer over de meting:{' '}
        <Link href="/marketing/resources/f-val" className="underline hover:text-gray-600">
          F-VAL uitgelegd
        </Link>
        .
      </p>

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
