'use client';

// Interactieve "hoe het werkt"-walkthrough — het signatuur-element van de
// homepage (zie website-verbeterplan v2). Vier stappen. De rechterkolom toonde
// productschermafbeeldingen; die zijn vervangen door een abstracte visual per
// stap (besluit Erik 2026-08-18): een screenshot vraagt om uitleg, terwijl deze
// sectie juist het principe moet overbrengen — en de visuals verouderen niet
// mee met de UI. Client-component vanwege de tab-state.

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, Bot, Dna, Sparkles } from 'lucide-react';

const BRAND_TINT = 'rgba(7,229,171,0.12)';
const BRAND_FILL = 'rgba(7,229,171,0.35)';

type Art = 'capture' | 'generate' | 'check' | 'scale';

type Step = {
  label: string;
  title: string;
  body: string;
  /** UX-17: 2-3 concrete highlights zodat de tekstkolom de visual draagt. */
  highlights: string[];
  cta: { label: string; href: string };
  Icon: typeof Dna;
  art: Art;
};

const STEPS: Step[] = [
  {
    label: 'Vastleggen',
    title: 'Leg je merk-DNA vast',
    body:
      'Brand voice, brandstyle, persona’s, producten en concurrenten, het complete merk in één workspace, klaar om overal in te zetten.',
    highlights: [
      '12 canonieke merk-assets met frameworks',
      'Brand voice en stijl uit je eigen materiaal',
      'Persona’s, producten en concurrenten erbij',
    ],
    cta: { label: 'Bekijk brand voice', href: '/marketing/features/brand-voice' },
    Icon: Dna,
    art: 'capture',
  },
  {
    label: 'Genereren',
    title: 'Genereer on-brand',
    body:
      'Content, campagnes en beeld, allemaal in jouw merk-DNA. Van blogpost tot LinkedIn-ad tot e-mailflow, in de stem van je merk.',
    highlights: [
      '25+ contenttypes',
      'Campagnes van strategie tot planning en deliverables',
      'Beeld in dezelfde merkstijl',
    ],
    cta: { label: 'Bekijk Content Canvas', href: '/marketing/features/content-canvas' },
    Icon: Sparkles,
    art: 'generate',
  },
  {
    label: 'Op merk checken',
    title: 'Check of het klopt',
    body:
      'Elke output krijgt een merkscore. Wat onder de norm valt, wordt automatisch herschreven. Dit zorgt voor consistentie zonder handwerk.',
    highlights: [
      'F-VAL-score 0-100 met concrete bevindingen',
      'Drempels per contenttype',
      'Onder de norm? Automatische herschrijfronde',
    ],
    cta: { label: 'Bekijk de merk-check', href: '/marketing/features/brand-alignment' },
    Icon: BadgeCheck,
    art: 'check',
  },
  {
    label: 'Schalen',
    title: 'Laat de agents het werk doen',
    body:
      'Schakel AI-agents in die altijd aan het werk voor je zijn: van onderzoek en trends tot content en bewaking, zodat je team op merk kan opschalen.',
    highlights: [
      'Voorstellen in je inbox, jij keurt goed',
      'Wekelijkse rapporten en 24/7-watchdogs',
      'Werkt ook in Claude en ChatGPT',
    ],
    cta: { label: 'Bekijk de agents', href: '/marketing/features/agents' },
    Icon: Bot,
    art: 'scale',
  },
];

export default function HowItWorks() {
  const [active, setActive] = useState(0);
  const step = STEPS[active];

  return (
    <div>
      <div role="tablist" aria-label="Hoe Branddock werkt" className="flex flex-wrap gap-2 mb-4">
        {STEPS.map((s, i) => (
          <button
            key={s.label}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              i === active
                ? 'mkt-btn-primary'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
            }`}
          >
            <span className="opacity-70" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            {s.label}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6 items-center rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
        <div className="order-2 md:order-1">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{step.title}</h3>
          <p className="text-gray-600 leading-relaxed mb-4">{step.body}</p>
          <ul className="flex flex-col gap-2 mb-5">
            {step.highlights.map((h) => (
              <li key={h} className="flex items-baseline gap-2 text-sm text-gray-700">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0"
                  style={{ transform: 'translateY(-2px)' }}
                  aria-hidden
                />
                {h}
              </li>
            ))}
          </ul>
          <Link
            href={step.cta.href}
            className="inline-flex items-center gap-2 text-sm font-medium mkt-accent"
          >
            {step.cta.label} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <StepVisual step={step} />
      </div>
    </div>
  );
}

/**
 * Abstracte visual per stap. Decoratief (aria-hidden): alle informatie staat al
 * in de tekstkolom ernaast, dus een screenreader hoeft dit niet te herhalen.
 */
function StepVisual({ step }: { step: Step }) {
  const { Icon } = step;
  return (
    <div
      className="order-1 md:order-2 rounded-xl border border-gray-200 p-6 flex flex-col items-center justify-center gap-4"
      style={{ background: BRAND_TINT, minHeight: '17rem' }}
      aria-hidden
    >
      <div
        className="w-14 h-14 rounded-xl bg-white flex items-center justify-center"
        style={{ boxShadow: '0 1px 3px rgba(16,24,40,0.1)' }}
      >
        <Icon className="w-7 h-7" style={{ color: 'var(--link-ink)' }} />
      </div>
      <StepArt art={step.art} />
    </div>
  );
}

function StepArt({ art }: { art: Art }) {
  if (art === 'capture') {
    return (
      <div className="flex flex-wrap justify-center gap-2 max-w-xs">
        {['Brand voice', 'Brandstyle', 'Persona’s', 'Producten', 'Concurrenten'].map((t) => (
          <span key={t} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-700">
            {t}
          </span>
        ))}
      </div>
    );
  }

  if (art === 'generate') {
    return (
      <div className="w-full max-w-xs flex flex-col gap-3">
        <div className="flex flex-wrap justify-center gap-2">
          {['Blogpost', 'LinkedIn-ad', 'E-mailflow'].map((t) => (
            <span key={t} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-700">
              {t}
            </span>
          ))}
        </div>
        <div className="rounded-lg bg-white p-3 flex flex-col gap-2">
          <div className="h-2 rounded w-full" style={{ background: BRAND_FILL }} />
          <div className="h-2 rounded w-5/6" style={{ background: BRAND_FILL }} />
          <div className="h-2 rounded w-4/6" style={{ background: BRAND_FILL }} />
        </div>
      </div>
    );
  }

  if (art === 'check') {
    return (
      <div className="w-full max-w-xs rounded-lg bg-white p-4">
        <div className="flex items-baseline justify-between mb-3">
          <span
            className="text-3xl font-bold"
            style={{ color: 'var(--link-ink)', fontVariantNumeric: 'tabular-nums' }}
          >
            86
          </span>
          <span className="text-xs font-semibold text-gray-500">drempel 75</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 relative">
          <div className="h-2 rounded-full" style={{ background: 'var(--primary)', width: '86%' }} />
          <span
            className="absolute top-0 h-2 bg-gray-400"
            style={{ left: '75%', width: '2px' }}
          />
        </div>
        <p className="text-xs text-gray-600 mt-3">On-brand, geen herschrijfronde nodig.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xs flex flex-col gap-3">
      <div className="flex justify-center gap-2">
        {['N', 'S', 'M', 'V', 'D'].map((initial) => (
          <span
            key={initial}
            className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-semibold"
            style={{ color: 'var(--link-ink)' }}
          >
            {initial}
          </span>
        ))}
      </div>
      <div className="rounded-lg bg-white px-3 py-2 text-xs text-gray-600 text-center">
        3 voorstellen wachten op je goedkeuring
      </div>
    </div>
  );
}
