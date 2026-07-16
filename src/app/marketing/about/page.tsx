// About-page met founder-story + missie. NL-first (Fase 2).

import type { Metadata } from 'next';
import Link from 'next/link';
import { appHref } from '../app-url';
import Mosaic from '../Mosaic';

export const metadata: Metadata = {
  title: 'Over ons',
  description:
    'Waarom Branddock bestaat: AI-content die je merk echt vertegenwoordigt — gebouwd vanuit een gedegen merkstrategie-fundament.',
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div
        className="relative overflow-hidden rounded-2xl p-8 md:p-12 mb-10"
        style={{ background: 'var(--g-brand)' }}
      >
        <Mosaic
          id="about"
          cols={7}
          rows={2}
          className="pointer-events-none absolute inset-0 w-full h-full"
          style={{ opacity: 0.2 }}
        />
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element -- statische SVG-merkasset */}
          <img src="/marketing/branddock-logo-white.svg" alt="Branddock" className="h-7 w-auto mb-5" />
          <h1 className="mb-0" style={{ color: '#ffffff' }}>
            Waarom Branddock bestaat
          </h1>
        </div>
      </div>

      <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
        <p>
          AI-contenttools beloven snelheid. Wat ze leveren is generieke output die je merk niet
          vertegenwoordigt. Het gevolg: marketingteams die uren kwijt zijn aan het “humaniseren” van
          AI-tekst.
        </p>
        <p>
          Branddock pakt het anders aan. We bouwen vanuit een gedegen merkstrategie-fundament — je
          brand voice, doelgroep, brandstyle, do’s en don’ts — en toetsen elke output aan die basis.
          Niet alleen “klinkt het goed?”, maar “past het bij dít specifieke merk?”.
        </p>
        <p>
          We zijn klein (Erik + AI-assistenten), gericht op in-house marketingteams, en bouwen in de
          open tijdens de pilot. Feedback van de eerste klanten stuurt direct de roadmap.
        </p>

        <h2 className="text-gray-900 mt-12">Onze missie</h2>
        <p>
          Marketingteams 10 uur per week teruggeven die nu opgaan aan rapportage, content-editing en
          briefings — zonder in te leveren op kwaliteit.
        </p>

        <h2 className="text-gray-900 mt-12">Team</h2>
        <p>
          Erik Jager — oprichter, voorheen bij BetterBrands. Branddock is ontstaan uit interne
          tooling die we voor klanten bouwden.
        </p>
        <p className="text-sm text-gray-500">Branddock is een product van BetterBrands B.V.</p>
      </div>

      <div className="mt-12 pt-8 border-t border-gray-200">
        <Link
          href={appHref('/?utm_source=marketing-site&utm_medium=about-cta')}
          className="inline-flex items-center px-6 py-3 rounded-lg bg-primary text-white font-medium hover:opacity-90"
        >
          Branddock proberen
        </Link>
      </div>
    </div>
  );
}
