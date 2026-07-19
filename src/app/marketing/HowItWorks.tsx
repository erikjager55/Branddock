'use client';

// Interactieve "hoe het werkt"-walkthrough — het signatuur-element van de
// homepage (zie website-verbeterplan v2). Vier stappen, elk met een échte
// productschermafbeelding. Client-component vanwege de tab-state.

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

type Step = {
  label: string;
  title: string;
  body: string;
  /** UX-17: 2-3 concrete highlights zodat de tekstkolom de screenshot draagt. */
  highlights: string[];
  cta: { label: string; href: string };
  img: string;
  alt: string;
};

const STEPS: Step[] = [
  {
    label: 'Vastleggen',
    title: 'Leg je merk-DNA vast',
    body:
      'Brand voice, brandstyle, persona’s, producten en concurrenten — het complete merk in één workspace, klaar om overal in te zetten.',
    highlights: [
      '11 canonieke merk-assets met frameworks',
      'Brand voice en stijl uit je eigen materiaal',
      'Persona’s, producten en concurrenten erbij',
    ],
    cta: { label: 'Bekijk brand voice', href: '/marketing/features/brand-voice' },
    img: '/marketing/features/brand-voice.png',
    alt: 'Branddock — brand voice en brandstyle vastleggen',
  },
  {
    label: 'Genereren',
    title: 'Genereer on-brand',
    body:
      'Content, campagnes en beeld — allemaal in jouw merk-DNA. Van blogpost tot LinkedIn-ad tot e-mailflow, in de stem van je merk.',
    highlights: [
      '25+ contenttypes over alle kanalen',
      'Campagnes van blueprint tot deliverables',
      'Beeld en video in dezelfde merkstijl',
    ],
    cta: { label: 'Bekijk Content Canvas', href: '/marketing/features/content-canvas' },
    img: '/marketing/features/content-canvas.png',
    alt: 'Branddock — Content Canvas',
  },
  {
    label: 'Op merk checken',
    title: 'Check of het klopt',
    body:
      'Elke output krijgt een merk-fideliteitsscore. Wat onder de norm valt, wordt automatisch herschreven — consistentie zonder handwerk.',
    highlights: [
      'F-VAL-score 0-100 met concrete bevindingen',
      'Drempels per contenttype',
      'Onder de norm? Automatische herschrijf-ronde',
    ],
    cta: { label: 'Bekijk de merk-check', href: '/marketing/features/brand-alignment' },
    img: '/marketing/features/brand-alignment.png',
    alt: 'Branddock — merk-check en alignment',
  },
  {
    label: 'Schalen',
    title: 'Laat de agents het werk doen',
    body:
      '9 AI-agents draaien de merk-loop: van onderzoek en trends tot content en bewaking, zodat je team op merk kan opschalen.',
    highlights: [
      'Voorstellen in je inbox — jij keurt goed',
      'Wekelijkse rapporten en 24/7-watchdogs',
      'Werkt ook in Claude en ChatGPT',
    ],
    cta: { label: 'Bekijk de agents', href: '/marketing/features/agents' },
    img: '/marketing/features/agents.png',
    alt: 'Branddock — AI-agents',
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
            <span className="tabular-nums opacity-70">{String(i + 1).padStart(2, '0')}</span>
            {s.label}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6 items-center rounded-2xl border border-gray-200 bg-white p-5 md:p-6">
        <div className="order-2 md:order-1">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{step.title}</h3>
          <p className="text-gray-600 leading-relaxed mb-4">{step.body}</p>
          <ul className="space-y-1.5 mb-5">
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
        <div className="order-1 md:order-2 mkt-frame">
          <div className="mkt-frame__bar">
            <i></i>
            <i></i>
            <i></i>
          </div>
          <Image
            src={step.img}
            alt={step.alt}
            width={2880}
            height={1800}
            className="w-full h-auto"
          />
        </div>
      </div>
    </div>
  );
}
