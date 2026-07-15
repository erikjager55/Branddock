// Pricing-page met 3-tier matrix + top-up-packs + FAQ. NL-first (Fase 2).
// Prijzen = ADR 2026-07-07-pricing-credits-launch (credit-model, launch-
// definitief): Starter €39/400cr · Growth €89/1.200cr · Agency €299/4.000cr,
// 28d no-card trial, top-up €0,10/credit. Bron: PLAN_CONFIGS + TOPUP_PACKS.
// CTA's via appHref → absoluut naar de app-host na de domein-cutover.

import Link from 'next/link';
import { Check } from 'lucide-react';
import { appHref } from '../app-url';

interface Tier {
  id: string;
  name: string;
  pricePerMonth: number;
  description: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  highlighted?: boolean;
}

const TIERS: Tier[] = [
  {
    id: 'starter',
    name: 'Starter',
    pricePerMonth: 39,
    description: 'Voor solo-founders en merken in de opstartfase',
    features: [
      '400 credits per maand',
      '1 workspace · 1 gebruiker',
      'Volledig merk-DNA + Brand Voice',
      'AI-content over 25+ contenttypes',
      'Merk-check (F-VAL) op elke output — gratis',
      'E-mailsupport',
    ],
    ctaLabel: 'Gratis proberen',
    ctaHref: '/?utm_source=marketing-site&utm_medium=pricing-starter',
  },
  {
    id: 'growth',
    name: 'Growth',
    pricePerMonth: 89,
    description: 'De sweet spot voor groeiende marketingteams',
    features: [
      '1.200 credits per maand',
      '3 workspaces · 5 gebruikers',
      'Alles uit Starter',
      'AI-agents (onderzoek, strategie, content, data)',
      'Concurrentie-intelligentie & Trend Radar',
      'Prioriteitssupport',
    ],
    ctaLabel: 'Gratis proberen',
    ctaHref: '/?utm_source=marketing-site&utm_medium=pricing-growth',
    highlighted: true,
  },
  {
    id: 'agency',
    name: 'Agency',
    pricePerMonth: 299,
    description: 'Voor bureaus die meerdere merken beheren',
    features: [
      '4.000 credits per maand',
      '10 workspaces · 20 gebruikers',
      'Alles uit Growth',
      'Multi-tenant klantbeheer',
      'Persoonlijke onboarding',
    ],
    ctaLabel: 'Gratis proberen',
    ctaHref: '/?utm_source=marketing-site&utm_medium=pricing-agency',
  },
];

// Top-up-packs — zelfde bron als de in-app catalogus (TOPUP_PACKS).
const TOPUPS = [
  { credits: '500', price: '€50' },
  { credits: '1.500', price: '€135 (10% korting)' },
  { credits: '5.000', price: '€400 (20% korting)' },
];

const FAQ_ITEMS = [
  {
    q: 'Krijg ik een proefperiode?',
    a: '28 dagen gratis met 300 credits — geen creditcard. Na de proef blijft je merkdata veilig en zichtbaar; je kiest pas een plan als je wilt blijven genereren.',
  },
  {
    q: 'Hoe werken credits?',
    a: 'Credits tellen alleen wat we voor je genereren (output): een kort stuk ≈ 5, longform ≈ 80, een afbeelding 2, een videoclip 20. Je merkcontext en elke merk-check (F-VAL) zijn altijd gratis — dat is juist het punt van Branddock.',
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
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <h1 className="text-gray-900 mb-4">Eenvoudige, transparante prijzen</h1>
          <p className="text-gray-600 text-lg">
            Kies een plan dat bij je team past. Geen verborgen kosten, geen lange contracten.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {TIERS.map((tier) => (
            <TierCard key={tier.id} tier={tier} />
          ))}
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
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 text-center text-sm text-gray-500">
          Prijzen zijn excl. btw. 28 dagen gratis met 300 credits — geen creditcard.
          Meer nodig dan Agency? <Link href="/marketing/contact" className="underline hover:text-gray-700">Praat met ons over Enterprise</Link>.
        </div>
      </section>

      <section className="bg-gray-50 border-y border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <h2 className="text-gray-900 mb-6 text-center">Veelgestelde vragen</h2>
          <div className="space-y-4">
            {FAQ_ITEMS.map((item) => (
              <details key={item.q} className="bg-white rounded-lg border border-gray-200 p-4">
                <summary className="font-medium text-gray-900 cursor-pointer">{item.q}</summary>
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
          ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
          : 'border-gray-200 bg-white'
      }`}
    >
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-gray-900">{tier.name}</h3>
        <p className="text-sm text-gray-600 mt-1">{tier.description}</p>
      </div>
      <div className="mb-6">
        <span className="text-4xl font-bold text-gray-900">€{tier.pricePerMonth}</span>
        <span className="text-gray-500">/maand</span>
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
            ? 'bg-primary text-white hover:opacity-90'
            : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}
      >
        {tier.ctaLabel}
      </Link>
    </div>
  );
}
