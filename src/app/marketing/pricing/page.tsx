// Pricing-page met 3-tier matrix + top-up-packs + FAQ. NL-first (Fase 2).
// Prijs/credits/workspace-/gebruikersaantallen komen rechtstreeks uit
// PLAN_CONFIGS/TRIAL_DAYS/TRIAL_CREDITS (src/lib/constants/plan-limits.ts) —
// de échte bron van waarheid die ook de in-app abonnement-vergelijking
// drijft. Marketingtekst (beschrijving, feature-bullets) blijft pagina-lokaal;
// alleen de getallen zijn gedeeld, zodat dit niet nog eens kan afwijken
// (compositie-herziening facturatie, Fase 4 — was een losse, handmatige kopie).
// CTA's via appHref → absoluut naar de app-host na de domein-cutover.

import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, ChevronDown, ShieldCheck } from 'lucide-react';
import { appHref } from '../app-url';
import SplitHeader from '../SplitHeader';
import { PLAN_CONFIGS, TOPUP_PACKS, TRIAL_DAYS, TRIAL_CREDITS } from '@/lib/constants/plan-limits';
import { creditExampleLine, creditExampleLineCompact } from '@/lib/constants/credit-examples';
import { CREDIT_COSTS, isZeroCostAction } from '@/lib/billing/credits/credit-costs';
import type { CreditAction } from '@/types/billing';

export const metadata: Metadata = {
  alternates: { canonical: '/marketing/pricing' },
  title: 'Prijzen',
  description: `Eenvoudige, transparante prijzen: Starter €${PLAN_CONFIGS.STARTER.monthlyPriceEur}, Growth €${PLAN_CONFIGS.GROWTH.monthlyPriceEur} of Agency €${PLAN_CONFIGS.AGENCY.monthlyPriceEur} per maand. ${TRIAL_DAYS} dagen gratis, geen creditcard.`,
};

const nl = new Intl.NumberFormat('nl-NL');

function workspaceSeatLine(workspaces: number, seats: number): string {
  const ws = workspaces === 1 ? 'workspace' : 'workspaces';
  const gb = seats === 1 ? 'gebruiker' : 'gebruikers';
  return `${nl.format(workspaces)} ${ws} · ${nl.format(seats)} ${gb}`;
}

interface TierCopy {
  id: 'starter' | 'growth' | 'agency';
  name: string;
  description: string;
  /** Handgeschreven marketing-bullets — de credits- en workspace/gebruikers-regel
   *  worden ervoor geplakt, afgeleid van PLAN_CONFIGS. */
  proseFeatures: string[];
  ctaLabel: string;
  ctaHref: string;
  highlighted?: boolean;
}

interface Tier extends TierCopy {
  pricePerMonth: number;
  features: string[];
  /** "Wat je hiervoor maakt"-regel, berekend uit monthlyCredits + CREDIT_COSTS (P4.1). */
  exampleLine: string;
}

const TIER_COPY: TierCopy[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Voor solo-founders en merken in de opstartfase',
    proseFeatures: [
      'Volledig merk-DNA + Brand Voice',
      'AI-content over 25+ contenttypes',
      'Merk-check (F-VAL) op elke output — gratis',
      'E-mailsupport',
    ],
    ctaLabel: 'Gratis proberen',
    ctaHref: '/?view=register&utm_source=marketing-site&utm_medium=pricing-starter',
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'De sweet spot voor groeiende marketingteams',
    proseFeatures: [
      'Alles uit Starter',
      'AI-agents (onderzoek, strategie, content, data)',
      'Concurrentie-intelligentie & Trend Radar',
      'Prioriteitssupport',
    ],
    ctaLabel: 'Gratis proberen',
    ctaHref: '/?view=register&utm_source=marketing-site&utm_medium=pricing-growth',
    highlighted: true,
  },
  {
    id: 'agency',
    name: 'Agency',
    description: 'Voor bureaus die meerdere merken beheren',
    proseFeatures: ['Alles uit Growth', 'Multi-tenant klantbeheer', 'Persoonlijke onboarding'],
    ctaLabel: 'Gratis proberen',
    ctaHref: '/?view=register&utm_source=marketing-site&utm_medium=pricing-agency',
  },
];

const TIERS: Tier[] = TIER_COPY.map((copy) => {
  const config = PLAN_CONFIGS[copy.id.toUpperCase() as 'STARTER' | 'GROWTH' | 'AGENCY'];
  return {
    ...copy,
    pricePerMonth: config.monthlyPriceEur,
    exampleLine: creditExampleLine(config.monthlyCredits),
    features: [
      `${nl.format(config.monthlyCredits)} credits per maand`,
      workspaceSeatLine(config.workspaces, config.seats),
      ...copy.proseFeatures,
    ],
  };
});

// Top-up-packs — zelfde bron als de in-app catalogus.
const TOPUPS = TOPUP_PACKS.map((p) => ({
  credits: nl.format(p.credits),
  price: p.discountPct > 0 ? `€${p.priceEur} (${p.discountPct}% korting)` : `€${p.priceEur}`,
  example: creditExampleLineCompact(p.credits),
}));

// ─── "Je betaalt voor wat je maakt" (P4.2) ───────────────────
// Gratis-laag: afgeleid van ZERO_COST_ACTIONS — het filter garandeert dat we
// nooit iets als gratis adverteren dat dat niet (meer) is.
const FREE_LAYER = [
  {
    action: 'brand-context',
    label: 'Merkcontext',
    sub: 'Je volledige merk-DNA gaat gratis mee in elke generatie — hoe rijk je merk ook is.',
  },
  {
    action: 'f-val',
    label: 'Merk-check (F-VAL)',
    sub: 'Elke output gescoord tegen je merk, inclusief herscoring na aanpassingen.',
  },
  {
    action: 'brand-assistant',
    label: 'Brand Assistant-chat',
    sub: 'Onbeperkt sparren met een assistent die je merk kent.',
  },
  {
    action: 'setup',
    label: 'Setup & merkanalyse',
    sub: 'Website-scan, brandstyle-analyse en merk-exploratie bij het inrichten.',
  },
].filter((item) => isZeroCostAction(item.action));

// Betaalde acties: labels bij de CREDIT_COSTS-registry — getallen komen
// rechtstreeks uit de registry, nooit uit deze pagina.
const PAID_ACTION_LABELS: Record<CreditAction, string> = {
  short: 'Kort content-item (social post, e-mail, ad)',
  'long-form': 'Long-form artikel (volledige SEO/GEO-pipeline)',
  image: 'Beeld',
  'video-clip': 'Videoclip',
  'agent-deliverable': 'Agent-deliverable (uitgewerkt concept in je inbox)',
};

const PAID_ACTIONS = (Object.keys(CREDIT_COSTS) as CreditAction[]).map((action) => ({
  label: PAID_ACTION_LABELS[action],
  credits: CREDIT_COSTS[action],
}));

const FAQ_ITEMS = [
  {
    q: 'Krijg ik een proefperiode?',
    a: `${TRIAL_DAYS} dagen gratis met ${nl.format(TRIAL_CREDITS)} credits — geen creditcard. Na de proef blijft je merkdata veilig en zichtbaar; je kiest pas een plan als je wilt blijven genereren.`,
  },
  {
    q: 'Hoe werken credits?',
    a: `Credits tellen alleen wat we voor je genereren (output): een kort stuk ≈ ${CREDIT_COSTS.short}, longform ≈ ${CREDIT_COSTS['long-form']}, een afbeelding ${CREDIT_COSTS.image}, een videoclip ${CREDIT_COSTS['video-clip']}. Ter indicatie: met Starter (${nl.format(PLAN_CONFIGS.STARTER.monthlyCredits)} credits) maak je ${creditExampleLine(PLAN_CONFIGS.STARTER.monthlyCredits)}. Je merkcontext en elke merk-check (F-VAL) zijn altijd gratis — dat is juist het punt van Branddock.`,
  },
  {
    q: 'Wat als mijn credits op zijn?',
    a: 'Top up op verzoek voor €0,10 per credit (packs vanaf 500 credits, volumekortingen tot 20%) — of zet auto-top-up aan met je eigen bestedingslimiet. Nooit een verrassingsfactuur.',
  },
  {
    q: 'Kan ik tussen tiers wisselen?',
    a: 'Ja, upgraden of downgraden kan altijd. Naar rato gefactureerd. Geen lock-in.',
  },
  {
    q: 'Hoe zit het met betalingen en btw?',
    a: 'Betaal met iDEAL, SEPA-incasso of kaart via Stripe. Prijzen zijn excl. btw; EU-bedrijven met een geldig btw-nummer krijgen automatisch een btw-verlegde factuur.',
  },
  {
    q: 'Welke AI-modellen gebruiken jullie?',
    a: 'Claude (Anthropic), GPT (OpenAI) en Gemini (Google). Per contenttype kiezen we het meest geschikte model.',
  },
];

export default function PricingPage() {
  return (
    <div>
      <section className="max-w-6xl mx-auto px-6 py-16">
        <SplitHeader
          id="pricing"
          family="product"
          eyebrow="Prijzen"
          title="Eenvoudige, transparante prijzen"
          lead="Kies een plan dat bij je team past. Geen verborgen kosten, geen lange contracten."
          className="mb-8"
        />

        {/* UX-09: de belangrijkste geruststelling boven de cards i.p.v. als
            grijze voetnoot eronder. */}
        <div className="mb-8 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700">
            <ShieldCheck className="w-4 h-4" style={{ color: 'var(--link-ink)' }} />
            Elk plan start met {TRIAL_DAYS} dagen gratis · {nl.format(TRIAL_CREDITS)} credits · geen
            creditcard
          </span>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {TIERS.map((tier) => (
            <TierCard key={tier.id} tier={tier} />
          ))}
        </div>

        {/* UX-09: na-trial-werking expliciet bij de cards (feitelijk: geen
            creditcard → trial loopt automatisch af, data blijft zichtbaar). */}
        <p className="mt-4 text-center text-sm text-gray-500">
          De trial loopt automatisch af — geen creditcard, dus geen verrassing. Je merkdata blijft
          veilig en zichtbaar; je kiest pas een plan als je wilt blijven genereren.
        </p>

        {/* UX-09: Enterprise met een duidelijke bestemming i.p.v. een losse
            tekstlink in de voetnoot.
            TODO(Erik): jaarfacturering-toggle met korting — bewust niet
            gebouwd zonder prijsbesluit (UX-09 punt 4). */}
        <div className="mt-8 max-w-2xl mx-auto rounded-xl border border-gray-200 bg-white p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-gray-900">Enterprise</div>
            <p className="text-sm text-gray-600 mt-0.5">
              Meer workspaces, eigen afspraken of security-reviews? We denken graag mee.
            </p>
          </div>
          <Link
            href="/marketing/contact"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
          >
            Praat met ons <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* "Je betaalt voor wat je maakt" — gratis-laag vs betaalde acties (P4.2) */}
        <div className="mt-16">
          <div className="max-w-2xl mb-8">
            <h2 className="text-gray-900 mb-2">
              Wij rekenen niets voor het kennen en bewaken van je merk
            </h2>
            <p className="text-gray-600">
              Credits meten alleen output. Alles wat je merk vastlegt, voedt en bewaakt is gratis —
              op elk plan, hoe intensief je het ook gebruikt.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl p-8" style={{ background: 'var(--brand-slate)' }}>
              <div className="flex items-center gap-2 mb-5">
                <ShieldCheck className="w-5 h-5" style={{ color: 'var(--brand-mint)' }} />
                <h3 className="text-lg font-semibold text-white">Altijd gratis</h3>
              </div>
              <ul className="space-y-4">
                {FREE_LAYER.map((item) => (
                  <li key={item.action}>
                    <div className="text-sm font-semibold text-white">{item.label}</div>
                    <div className="text-sm" style={{ color: 'rgba(255,255,255,0.72)' }}>
                      {item.sub}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-5">
                Credits betaal je alleen als je iets maakt
              </h3>
              <ul className="divide-y divide-gray-100">
                {PAID_ACTIONS.map((item) => (
                  <li key={item.label} className="flex items-baseline justify-between gap-4 py-2.5">
                    <span className="text-sm text-gray-700">{item.label}</span>
                    <span className="text-sm font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                      {item.credits === 1 ? '1 credit' : `${item.credits} credits`}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-500 mt-4">
                Indicatieve schatting vooraf — de werkelijke afboeking meet alleen de daadwerkelijk
                gegenereerde output.
              </p>
            </div>
          </div>
        </div>

        {/* Top-up-packs */}
        <div className="mt-12 max-w-2xl mx-auto">
          <h2 className="text-gray-900 text-center mb-2">Meer nodig? Top up wanneer je wilt.</h2>
          <p className="text-gray-600 text-center text-sm mb-6">
            €0,10 per credit, volumekortingen inbegrepen. Credits verlopen niet zolang je plan actief is.
          </p>
          <div className="grid grid-cols-3 gap-4">
            {TOPUPS.map((t) => (
              <div key={t.credits} className="rounded-lg border border-gray-200 bg-white p-4 text-center">
                <div className="text-lg font-semibold text-gray-900">{t.credits} credits</div>
                <div className="text-sm text-gray-600">{t.price}</div>
                <div className="text-xs text-gray-500 mt-1">{t.example}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 text-center text-sm text-gray-500">
          Prijzen zijn excl. btw.
        </div>
      </section>

      <section className="bg-gray-50 border-y border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <h2 className="text-gray-900 mb-6 text-center">Veelgestelde vragen</h2>
          <div className="space-y-4">
            {FAQ_ITEMS.map((item) => (
              <details key={item.q} className="group bg-white rounded-lg border border-gray-200 p-4">
                <summary className="flex cursor-pointer items-center justify-between gap-3 font-medium text-gray-900 list-none">
                  {item.q}
                  <ChevronDown className="w-5 h-5 mkt-accent shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function TierCard({ tier }: { tier: Tier }) {
  return (
    <div
      className={`rounded-xl border p-6 flex flex-col ${
        tier.highlighted
          ? 'border-primary bg-primary/5 ring-1 ring-primary/30 shadow-md'
          : 'border-gray-200 bg-white'
      }`}
    >
      {tier.highlighted ? <div className="mkt-badge-popular mb-3 self-start">Populairste keuze</div> : null}
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-gray-900">{tier.name}</h3>
        <p className="text-sm text-gray-600 mt-1">{tier.description}</p>
      </div>
      <div className="mb-6">
        <span className="text-4xl font-bold text-gray-900">€{tier.pricePerMonth}</span>
        <span className="text-gray-500">/maand</span>
        {/* "Wat je hiervoor maakt" — berekend uit monthlyCredits + CREDIT_COSTS (P4.1) */}
        <p className="text-sm text-gray-600 mt-2">{tier.exampleLine}</p>
      </div>
      <ul className="space-y-2 mb-8 flex-1">
        {tier.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
            <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            {f}
          </li>
        ))}
      </ul>
      <Link
        href={appHref(tier.ctaHref)}
        className={`inline-flex items-center justify-center px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
          tier.highlighted
            ? 'mkt-btn-primary'
            : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}
      >
        {tier.ctaLabel}
      </Link>
    </div>
  );
}
