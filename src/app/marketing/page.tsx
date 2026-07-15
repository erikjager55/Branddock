// Homepage — value-prop hero + 3-bullet features + customer-quote + CTA.
// Placeholder copy gemarkeerd met {/* COPY-TODO */} — user vervangt vóór go-live.

import Link from 'next/link';
import { appHref } from './app-url';

// Provider-neutrale demo-boeking (Morgen/Calendly/Cal.com — elke booking-URL).
// Met een boekingslink: open die (nieuw tabblad). Zonder: val terug op de
// contactpagina i.p.v. een dood `#`, zodat "Book a demo" altijd iets doet.
function BookDemoButton() {
  const bookingUrl =
    process.env.NEXT_PUBLIC_BOOKING_URL ?? process.env.NEXT_PUBLIC_CALENDLY_URL ?? null;
  const cls =
    'inline-flex items-center px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50';
  if (bookingUrl) {
    return (
      <a href={bookingUrl} target="_blank" rel="noopener noreferrer" className={cls}>
        Book a demo
      </a>
    );
  }
  return (
    <Link href="/marketing/contact" className={cls}>
      Book a demo
    </Link>
  );
}

export default function MarketingHomePage() {
  return (
    <div>
      <Hero />
      <FeatureTrio />
      {/* CustomerQuote bewust verborgen tot er een ECHTE pilot-quote is
          (mét naam/rol/bedrijf) — geen verzonnen social proof bij launch.
          Component staat klaar in CustomerQuote() hieronder; render 'm terug
          zodra de quote-tekst is ingevuld. */}
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
          AI content that fits your brand. Not generic. Not an AI cliché.
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl">
          Branddock combines brand strategy, audience research and AI content
          generation in one platform. For B2B SaaS marketing teams that won&apos;t
          trade quality for speed.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href={appHref("/?utm_source=marketing-site&utm_medium=hero")}
            className="inline-flex items-center px-6 py-3 rounded-lg bg-primary text-white font-medium hover:opacity-90"
          >
            Start free trial
          </Link>
          <BookDemoButton />
        </div>
        <div className="mt-6 text-xs text-gray-500">
          28 days free · No credit card required · Cancel anytime
        </div>
      </div>
    </section>
  );
}

function FeatureTrio() {
  // COPY-TODO: vervang feature-bullets met definitieve value-props
  const features = [
    {
      title: 'Brand Voice that truly fits',
      body:
        'Build your brand voice from sample texts or a voiceguide. Branddock learns from your material — not from the generic web.',
    },
    {
      title: 'Content Canvas with 25+ types',
      body:
        'From blog post to LinkedIn ad to email sequence. With automated quality gates and F-VAL fidelity scoring per output.',
    },
    {
      title: 'Brand Alignment Insights',
      body:
        'See which content scores, which falls below threshold and why. No black box: per-pillar breakdown + actionable findings.',
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

// Klaargezet maar bewust nog niet gerenderd — zie MarketingHomePage().
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function CustomerQuote() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-16">
      <div className="max-w-2xl mx-auto text-center">
        {/* COPY-TODO: vul een ECHTE quote in (naam · rol · bedrijf), render dan
            <CustomerQuote /> terug in MarketingHomePage(). */}
        <blockquote className="text-xl md:text-2xl text-gray-700 leading-snug mb-4">
          &ldquo;[echte pilot-quote — één zin]&rdquo;
        </blockquote>
        <div className="text-sm text-gray-500">— [Naam] · [Rol] · [Bedrijf]</div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="bg-primary/5 border-y border-primary/20">
      <div className="max-w-6xl mx-auto px-6 py-16 text-center">
        <h2 className="text-gray-900 mb-4">Ready to get started?</h2>
        <p className="text-gray-600 mb-8 max-w-xl mx-auto">
          Try Branddock free for 28 days. No credit card. No commitments.
        </p>
        <Link
          href={appHref("/?utm_source=marketing-site&utm_medium=final-cta")}
          className="inline-flex items-center px-6 py-3 rounded-lg bg-primary text-white font-medium hover:opacity-90"
        >
          Start free trial
        </Link>
      </div>
    </section>
  );
}
