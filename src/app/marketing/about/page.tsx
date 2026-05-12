// About-page met founder-story + missie.
// COPY-TODO: vervang met definitieve content vóór go-live.

import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-gray-900 mb-6">Waarom Branddock bestaat</h1>

      {/* COPY-TODO: vervang founder-story met user's eigen versie */}
      <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
        <p>
          AI-content tools beloven snelheid. Wat ze leveren is generieke output die je
          merk niet vertegenwoordigt. Het resultaat: marketing-teams die uren spenderen
          aan het &quot;menselijk maken&quot; van AI-tekst.
        </p>
        <p>
          Branddock pakt het anders aan. We bouwen vanuit een rigide brand strategy
          fundament — je merkstem, audience, brandstyle, do/dont&apos;s — en valideren
          elke output tegen die baseline. Niet alleen &quot;klinkt het goed?&quot; maar
          &quot;past het bij dit specifieke merk?&quot;
        </p>
        <p>
          We zijn klein (Erik + AI-assistenten), gefocust op B2B SaaS marketing-teams,
          en bouwen open in de pilot. Feedback van de eerste 5 klanten stuurt direct
          de roadmap.
        </p>

        <h2 className="text-gray-900 mt-12">Onze missie</h2>
        <p>
          Marketing-teams 10 uur per week teruggeven die ze nu spenderen aan
          rapportage, content-bewerking en briefings, zonder kwaliteit op te offeren.
        </p>

        <h2 className="text-gray-900 mt-12">Team</h2>
        <p>
          Erik Jager — founder, eerder bij BetterBrands. Branddock spun off uit
          interne tooling die we voor klanten bouwden.
        </p>
        <p className="text-sm text-gray-500">
          Branddock is een product van BetterBrands B.V.
        </p>
      </div>

      <div className="mt-12 pt-8 border-t border-gray-200">
        <Link
          href="/?utm_source=marketing-site&utm_medium=about-cta"
          className="inline-flex items-center px-6 py-3 rounded-lg bg-primary text-white font-medium hover:opacity-90"
        >
          Probeer Branddock
        </Link>
      </div>
    </div>
  );
}
