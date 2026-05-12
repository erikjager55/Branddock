// Homepage — value-prop hero + 3-bullet features + customer-quote + CTA.
// Placeholder copy gemarkeerd met {/* COPY-TODO */} — user vervangt vóór go-live.

import Link from 'next/link';

export default function MarketingHomePage() {
  return (
    <div>
      <Hero />
      <FeatureTrio />
      <CustomerQuote />
      <FinalCTA />
    </div>
  );
}

function Hero() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20 md:py-28">
      <div className="max-w-3xl">
        {/* COPY-TODO: vervang hero-headline + subheadline na pilot-feedback */}
        <h1 className="text-gray-900 mb-6">
          AI-content die past bij jouw merk. Niet generiek. Niet AI-cliché.
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl">
          Branddock combineert brand strategy, audience research en AI content
          generation in één platform. Voor B2B SaaS marketing teams die kwaliteit
          niet willen inruilen voor snelheid.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/?utm_source=marketing-site&utm_medium=hero"
            className="inline-flex items-center px-6 py-3 rounded-lg bg-primary text-white font-medium hover:opacity-90"
          >
            Start gratis trial
          </Link>
          <a
            href={process.env.NEXT_PUBLIC_CALENDLY_URL ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
          >
            Boek een demo
          </a>
        </div>
        <div className="mt-6 text-xs text-gray-500">
          14 dagen gratis · Geen creditcard nodig · Opzeggen wanneer je wilt
        </div>
      </div>
    </section>
  );
}

function FeatureTrio() {
  // COPY-TODO: vervang feature-bullets met definitieve value-props
  const features = [
    {
      title: 'Brand Voice die echt past',
      body:
        'Bouw je merkstem vanuit voorbeeldteksten of voiceguide. Branddock leert van jouw materiaal — niet van het generieke web.',
    },
    {
      title: 'Content Studio met 53 types',
      body:
        'Van blogpost tot LinkedIn-ad tot e-mailsequence. Met automated quality-gates en F-VAL fidelity-scoring per output.',
    },
    {
      title: 'Brand Alignment Insights',
      body:
        'Zie welke content scoort, welke onder threshold valt en waarom. Geen black box: per-pijler breakdown + actionable findings.',
    },
  ];
  return (
    <section className="bg-gray-50 border-y border-gray-200">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((f) => (
            <div key={f.title}>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CustomerQuote() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-16">
      <div className="max-w-2xl mx-auto text-center">
        {/* COPY-TODO: vervang met definitieve pilot-customer quote */}
        <blockquote className="text-xl md:text-2xl text-gray-700 leading-snug mb-4">
          &ldquo;Branddock gaf ons in 2 weken een brand voice baseline waar we anders een
          extern bureau voor hadden moeten inhuren. AI-content voelt echt als ons.&rdquo;
        </blockquote>
        <div className="text-sm text-gray-500">
          — Pilot-customer placeholder · CMO bij B2B SaaS scale-up
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="bg-primary/5 border-y border-primary/20">
      <div className="max-w-6xl mx-auto px-6 py-16 text-center">
        <h2 className="text-gray-900 mb-4">Klaar om te starten?</h2>
        <p className="text-gray-600 mb-8 max-w-xl mx-auto">
          Probeer Branddock 14 dagen gratis. Geen creditcard. Geen verplichtingen.
        </p>
        <Link
          href="/?utm_source=marketing-site&utm_medium=final-cta"
          className="inline-flex items-center px-6 py-3 rounded-lg bg-primary text-white font-medium hover:opacity-90"
        >
          Start gratis trial
        </Link>
      </div>
    </section>
  );
}
