// Pricing-page met 3-tier matrix + top-up-packs + FAQ.
// Prijzen = ADR 2026-07-07-pricing-credits-launch (credit-model, launch-
// definitief): Starter €39/400cr · Growth €89/1.200cr · Agency €299/4.000cr,
// 28d no-card trial, top-up €0,10/credit. Bron: PLAN_CONFIGS + TOPUP_PACKS.

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

const TIERS: Tier[] = [
  {
    id: 'starter',
    name: 'Starter',
    pricePerMonth: 39,
    description: 'For solo founders and early-stage brands',
    features: [
      '400 credits per month',
      '1 workspace · 1 user',
      'Full brand DNA + Brand Voice',
      'AI content across 25+ content types',
      'Brand-fit scoring (F-VAL) on every piece — free',
      'Email support',
    ],
    ctaLabel: 'Start free trial',
    ctaHref: '/?utm_source=marketing-site&utm_medium=pricing-starter',
  },
  {
    id: 'growth',
    name: 'Growth',
    pricePerMonth: 89,
    description: 'The sweet spot for growing marketing teams',
    features: [
      '1,200 credits per month',
      '3 workspaces · 5 users',
      'Everything in Starter',
      'AI agents (research, strategy, content, data)',
      'Competitive intelligence & trend radar',
      'Priority support',
    ],
    ctaLabel: 'Start free trial',
    ctaHref: '/?utm_source=marketing-site&utm_medium=pricing-growth',
    highlighted: true,
  },
  {
    id: 'agency',
    name: 'Agency',
    pricePerMonth: 299,
    description: 'For agencies managing multiple brands',
    features: [
      '4,000 credits per month',
      '10 workspaces · 20 users',
      'Everything in Growth',
      'Multi-tenant client management',
      'Dedicated onboarding',
    ],
    ctaLabel: 'Start free trial',
    ctaHref: '/?utm_source=marketing-site&utm_medium=pricing-agency',
  },
];

// Top-up-packs — zelfde bron als de in-app catalogus (TOPUP_PACKS).
const TOPUPS = [
  { credits: '500', price: '€50' },
  { credits: '1,500', price: '€135 (10% off)' },
  { credits: '5,000', price: '€400 (20% off)' },
];

const FAQ_ITEMS = [
  {
    q: 'Do I get a trial?',
    a: '28 days free with 300 credits — no credit card required. After the trial your brand data stays safe and visible; you only pick a plan when you want to keep generating.',
  },
  {
    q: 'How do credits work?',
    a: 'Credits only count what we generate for you (output): a short piece ≈ 5, long-form ≈ 80, an image 2, a video clip 20. Your brand context and every brand-fit check (F-VAL) are always free — that\'s the point of Branddock.',
  },
  {
    q: 'What if I run out of credits?',
    a: 'Top up on demand at €0.10 per credit (packs from 500 credits, volume discounts up to 20%) — or enable auto top-up with your own spending cap. Never a surprise invoice.',
  },
  {
    q: 'Can I switch between tiers?',
    a: 'Yes, upgrade or downgrade at any time. Pro-rated billing. No lock-in.',
  },
  {
    q: 'How do you handle payments and VAT?',
    a: 'Pay by iDEAL, SEPA direct debit or card via Stripe. Prices exclude VAT; EU businesses with a valid VAT number get reverse-charged invoices automatically.',
  },
  {
    q: 'Which AI models do you use?',
    a: 'Claude (Anthropic), GPT (OpenAI) and Gemini (Google). For each content type we pick the most suitable model.',
  },
];

export default function PricingPage() {
  return (
    <div>
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <h1 className="text-gray-900 mb-4">Simple, transparent pricing</h1>
          <p className="text-gray-600 text-lg">
            Choose a plan that fits your team. No hidden costs, no long contracts.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {TIERS.map((tier) => (
            <TierCard key={tier.id} tier={tier} />
          ))}
        </div>

        {/* Top-up-packs */}
        <div className="mt-12 max-w-2xl mx-auto">
          <h2 className="text-gray-900 text-center mb-2">Need more? Top up any time.</h2>
          <p className="text-gray-600 text-center text-sm mb-6">
            €0.10 per credit, volume discounts included. Credits never expire while your plan is active.
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
          Prices exclude VAT. 28-day free trial with 300 credits — no credit card required.
          Need more than Agency? <Link href="/marketing/contact" className="underline hover:text-gray-700">Talk to us about Enterprise</Link>.
        </div>
      </section>

      <section className="bg-gray-50 border-y border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <h2 className="text-gray-900 mb-6 text-center">Frequently asked questions</h2>
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
        <span className="text-gray-500">/month</span>
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
