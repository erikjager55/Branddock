// Feature deep-dive pages — één bestand voor alle 4 features via [slug].
// SCREENSHOT-TODO: vervang placeholder-images in public/marketing/features/

import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';

interface FeatureSpec {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  bullets: string[];
  screenshotPath: string | null;
}

const FEATURES: Record<string, FeatureSpec> = {
  'brand-voice': {
    slug: 'brand-voice',
    title: 'Brand Voice die echt past',
    tagline: 'Bouw je merkstem vanuit voorbeeldteksten — geen generieke prompts.',
    description:
      'Branddock leert je merkstem uit voiceguide-input, voorbeeldteksten of beide. Elke generation wordt gevalideerd tegen die baseline, niet tegen "klinkt het goed in het algemeen".',
    bullets: [
      'Voiceguide-extractie uit 3 voorbeeldteksten in 5 minuten',
      'Voice-similarity scoring per generated variant (W-1-full embedding)',
      'STRICT mode rewrite voor anti-AI-tells op aanvraag',
      'Per content-type custom thresholds (blog vs LinkedIn vs e-mail)',
    ],
    screenshotPath: '/marketing/features/brand-voice.png', // TODO: vervang
  },
  'content-studio': {
    slug: 'content-studio',
    title: 'Content Studio met 53 types',
    tagline: 'Van blogpost tot persbericht tot LinkedIn-ad — één canvas, alle formats.',
    description:
      'Briefing in, AI-content uit, met automated quality-gates op elke stap. Multivariate output (2-3 headline-opties), property-evals (18 deterministic checks), F-VAL composite-scoring per variant.',
    bullets: [
      '53 content-types vanaf blog en social tot persbericht en case-study',
      'Multivariate output: 2-3 headline-opties + 1 voorkeursvariant per generation',
      'Layer 1 property-evals: 18 deterministic checks per variant (placeholder, PII, banned phrases, claim substantiation)',
      'Chain-of-prompts upgrades: implicit CoT + Plan-and-Solve + Tree-of-Thoughts angles',
      'Auto-iterate orchestrator: bij score-onder-threshold automatic feedback-driven rewrite (max 2 attempts)',
    ],
    screenshotPath: '/marketing/features/content-studio.png',
  },
  'brand-alignment': {
    slug: 'brand-alignment',
    title: 'Brand Alignment Insights',
    tagline: 'Zie waarom content scoort zoals het scoort.',
    description:
      'Geen black box: per generation breakdown van style-fit / brand-judge / rules-compliance. Categorize findings naar VOICE / TERMINOLOGY / CLAIMS / STYLE / BUSINESS / AI-TELL met severity en concrete suggestions.',
    bullets: [
      '3-pijler F-VAL scoring: style (35%) / judge (45%) / rules (20%)',
      'BrandReviewFinding-categorisatie met HIGH/MEDIUM/LOW severity',
      'Compliance dimensie: claim-substantiation + sector-specifieke risico-flags',
      '30-dagen trend dashboard met pass-rate per content-type',
      'Edit-distance signal voor regression-corpus filter',
    ],
    screenshotPath: '/marketing/features/brand-alignment.png',
  },
  'brandclaw': {
    slug: 'brandclaw',
    title: 'Brandclaw competitive intelligence',
    tagline: 'Monitor concurrenten op brand-niveau, niet alleen pricing.',
    description:
      'Brandclaw tracks competitor messaging shifts, nieuwe content-items en strategic moves. Voor pro+ tiers — autonomous marketing-loop in ontwikkeling.',
    bullets: [
      'Competitor content-item discovery via sitemap-monitoring',
      'AI-event classifier voor strategic moves (rebranding, pricing-change, etc.)',
      'Battlecard-generation op aanvraag (post-launch)',
      'Strategic analyst stub (post-launch transformation)',
    ],
    screenshotPath: null, // Brandclaw is post-launch — geen screenshot beschikbaar
  },
};

export function generateStaticParams() {
  return Object.keys(FEATURES).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const feature = FEATURES[slug];
  if (!feature) return { title: 'Feature niet gevonden — Branddock' };
  return {
    title: `${feature.title} — Branddock`,
    description: feature.tagline,
  };
}

export default async function FeaturePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const feature = FEATURES[slug];
  if (!feature) notFound();

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="mb-8">
        <h1 className="text-gray-900 mb-3">{feature.title}</h1>
        <p className="text-xl text-gray-600">{feature.tagline}</p>
      </div>

      {feature.screenshotPath ? (
        <div className="mb-10 rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
          {/* SCREENSHOT-TODO: voeg daadwerkelijke product-screenshots toe in public/marketing/features/ */}
          <div className="aspect-video flex items-center justify-center text-gray-400 text-sm">
            Screenshot komt hier — {feature.screenshotPath}
          </div>
        </div>
      ) : null}

      <p className="text-gray-700 text-lg mb-8 leading-relaxed">{feature.description}</p>

      <h2 className="text-gray-900 mb-4">Wat je krijgt</h2>
      <ul className="space-y-3 mb-12">
        {feature.bullets.map((b) => (
          <li key={b} className="flex items-start gap-3 text-gray-700">
            <span className="text-primary mt-1">→</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <div className="pt-8 border-t border-gray-200 flex flex-wrap gap-3">
        <Link
          href={`/?utm_source=marketing-site&utm_medium=feature-${feature.slug}`}
          className="inline-flex items-center px-6 py-3 rounded-lg bg-primary text-white font-medium hover:opacity-90"
        >
          Probeer Branddock
        </Link>
        <Link
          href="/marketing/pricing"
          className="inline-flex items-center px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
        >
          Bekijk prijzen
        </Link>
      </div>
    </div>
  );
}
