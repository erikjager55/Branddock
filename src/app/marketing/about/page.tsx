// About-page met founder-story + missie. NL-first (Fase 2).

import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { appHref } from '../app-url';
import SplitHeader from '../SplitHeader';

export const metadata: Metadata = {
  title: 'Over ons',
  description:
    'Waarom Branddock bestaat: AI-content die je merk echt vertegenwoordigt — gebouwd vanuit een gedegen merkstrategie-fundament.',
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <SplitHeader
        id="about"
        family="people"
        logo
        title="Waarom Branddock bestaat"
        className="mb-10"
      />

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
        <div className="not-prose flex items-start gap-5 rounded-2xl border border-gray-200 bg-white p-6">
          <Image
            src="/marketing/team/erik-jager.jpg"
            alt="Erik Jager, oprichter van Branddock"
            width={112}
            height={112}
            className="rounded-full object-cover shrink-0"
          />
          <div>
            <div className="font-semibold text-gray-900">Erik Jager</div>
            <div className="text-sm mkt-accent font-medium mb-2">Oprichter</div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Voorheen bij BetterBrands. Branddock is ontstaan uit interne tooling die we voor
              klanten bouwden.
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-500">Branddock is een product van BetterBrands B.V.</p>
      </div>

      <div className="mt-12 pt-8 border-t border-gray-200">
        <Link
          href={appHref('/?view=register&utm_source=marketing-site&utm_medium=about-cta')}
          className="inline-flex items-center px-6 py-3 rounded-lg mkt-btn-primary font-medium"
        >
          Branddock proberen
        </Link>
      </div>
    </div>
  );
}
