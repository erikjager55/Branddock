'use client';

// Interactieve "hoe het werkt"-walkthrough — het signatuur-element van de
// homepage (zie website-verbeterplan v2). Vier stappen, elk met een échte
// productschermafbeelding. Client-component vanwege de tab-state.

import { useState } from 'react';
import Image from 'next/image';

type Step = {
  label: string;
  title: string;
  body: string;
  img: string;
  alt: string;
};

const STEPS: Step[] = [
  {
    label: 'Vastleggen',
    title: 'Leg je merk-DNA vast',
    body:
      'Brand voice, brandstyle, persona’s, producten en concurrenten — het complete merk in één workspace, klaar om overal in te zetten.',
    img: '/marketing/features/brand-voice.png',
    alt: 'Branddock — brand voice en brandstyle vastleggen',
  },
  {
    label: 'Genereren',
    title: 'Genereer on-brand',
    body:
      'Content, campagnes en beeld — allemaal in jouw merk-DNA. Van blogpost tot LinkedIn-ad tot e-mailflow, in de stem van je merk.',
    img: '/marketing/features/content-canvas.png',
    alt: 'Branddock — Content Canvas',
  },
  {
    label: 'Op merk checken',
    title: 'Check of het klopt',
    body:
      'Elke output krijgt een merk-fideliteitsscore. Wat onder de norm valt, wordt automatisch herschreven — consistentie zonder handwerk.',
    img: '/marketing/features/brand-alignment.png',
    alt: 'Branddock — merk-check en alignment',
  },
  {
    label: 'Schalen',
    title: 'Laat de agents het werk doen',
    body:
      '9 AI-agents draaien de merk-loop: van onderzoek en trends tot content en bewaking, zodat je team op merk kan opschalen.',
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
                ? 'bg-primary text-white'
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
          <p className="text-gray-600 leading-relaxed">{step.body}</p>
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
