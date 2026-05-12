// Pricing-page met 3-tier matrix + FAQ.
// Tier-prijzen: PLACEHOLDER — finalize sprint #7 voor go-live.

import Link from 'next/link';
import { Check } from 'lucide-react';

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

// PRICING-TODO: valideer met user vóór go-live; placeholder per task §70-74
const TIERS: Tier[] = [
  {
    id: 'starter',
    name: 'Starter',
    pricePerMonth: 49,
    description: 'Voor solo-founders en early-stage teams',
    features: [
      '1 workspace',
      '1 user',
      '50 content-items per maand',
      'Brand Voice + Content Studio',
      'E-mail support',
    ],
    ctaLabel: 'Start trial',
    ctaHref: '/?utm_source=marketing-site&utm_medium=pricing-starter',
  },
  {
    id: 'pro',
    name: 'Pro',
    pricePerMonth: 149,
    description: 'Sweet-spot voor SMB marketing teams',
    features: [
      '3 workspaces',
      '5 users',
      '200 content-items per maand',
      'Brandclaw competitive intelligence',
      'Priority support',
      'F-VAL custom thresholds',
    ],
    ctaLabel: 'Start trial',
    ctaHref: '/?utm_source=marketing-site&utm_medium=pricing-pro',
    highlighted: true,
  },
  {
    id: 'agency',
    name: 'Agency',
    pricePerMonth: 399,
    description: 'Voor agencies + multi-tenant scenarios',
    features: [
      '10 workspaces',
      '20 users',
      'Unlimited content-items',
      'Multi-tenant organization',
      'White-label branding',
      'Dedicated success manager',
    ],
    ctaLabel: 'Contact sales',
    ctaHref: '/marketing/contact',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Krijg ik een trial?',
    a: '14 dagen gratis op de Starter of Pro tier. Geen creditcard nodig. Opzeggen wanneer je wilt.',
  },
  {
    q: 'Hoe wordt een content-item geteld?',
    a: 'Elke unieke generation (blogpost, social post, e-mail, etc.) telt als 1 content-item. Regeneraties van dezelfde variant tellen niet.',
  },
  {
    q: 'Kan ik tussen tiers wisselen?',
    a: 'Ja, op elk moment upgrade of downgrade. Pro-rated billing. Geen lock-in.',
  },
  {
    q: 'Wat als ik over mijn limiet ga?',
    a: 'Je content-item limiet reset elke maand. Bij overschrijding pauzeert generation tot reset — geen verrassings-facturen.',
  },
  {
    q: 'Welke AI-modellen gebruiken jullie?',
    a: 'Claude (Anthropic), GPT-4 (OpenAI) en Gemini (Google). Per content-type kies het meest geschikte model.',
  },
];

export default function PricingPage() {
  return (
    <div>
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <h1 className="text-gray-900 mb-4">Eenvoudige, transparante prijzen</h1>
          <p className="text-gray-600 text-lg">
            Kies een plan dat past bij je team. Geen verborgen kosten, geen lange contracten.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {TIERS.map((tier) => (
            <TierCard key={tier.id} tier={tier} />
          ))}
        </div>

        <div className="mt-12 text-center text-sm text-gray-500">
          Prijzen exclusief BTW. Maandelijks of jaarlijks (10% korting). Annual billing
          beschikbaar na pilot-fase.
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
        href={tier.ctaHref}
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
