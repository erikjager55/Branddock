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
    title: 'Brand Voice that truly fits',
    tagline: 'Build your brand voice from sample texts — no generic prompts.',
    description:
      'Branddock learns your brand voice from voiceguide input, sample texts or both. Every generation is validated against that baseline, not against "does it sound good in general".',
    bullets: [
      'Voiceguide extraction from 3 sample texts in 5 minutes',
      'Voice-similarity scoring per generated variant (W-1-full embedding)',
      'STRICT mode rewrite for anti-AI tells on demand',
      'Per content-type custom thresholds (blog vs LinkedIn vs email)',
    ],
    screenshotPath: '/marketing/features/brand-voice.png', // TODO: vervang
  },
  'content-canvas': {
    slug: 'content-canvas',
    title: 'Content Canvas — 25+ content types',
    tagline: 'From blog post to landing page to LinkedIn ad — one canvas, all formats.',
    description:
      'Briefing in, on-brand content out, with automated quality gates at every step. Multivariate output, deterministic property checks, and a brand-fit score (F-VAL) on every variant — plus full web pages and SEO/GEO long-form with a visual page builder.',
    bullets: [
      '25+ content types, from blog and social to ads, landing pages and SEO/GEO long-form',
      'Multivariate output: multiple angles + 1 preferred variant per generation',
      'Deterministic property checks per variant (placeholders, PII, banned phrases, claims)',
      'Visual web-page builder with publishable pages on your own URL',
      'Auto-iterate: when a score is below threshold, an automatic feedback-driven rewrite',
    ],
    screenshotPath: '/marketing/features/content-canvas.png',
  },
  'brand-alignment': {
    slug: 'brand-alignment',
    title: 'Brand Alignment Insights',
    tagline: 'See why content scores the way it does.',
    description:
      'No black box: a per-generation breakdown of style-fit / brand-judge / rules-compliance. Findings are categorized into VOICE / TERMINOLOGY / CLAIMS / STYLE / BUSINESS / AI-TELL with severity and concrete suggestions.',
    bullets: [
      '3-pillar F-VAL scoring: style (35%) / judge (45%) / rules (20%)',
      'BrandReviewFinding categorization with HIGH/MEDIUM/LOW severity',
      'Compliance dimension: claim substantiation + sector-specific risk flags',
      '30-day trend dashboard with pass rate per content type',
      'Edit-distance signal for the regression-corpus filter',
    ],
    screenshotPath: '/marketing/features/brand-alignment.png',
  },
  'agents': {
    slug: 'agents',
    title: 'AI agents that know your brand',
    tagline: 'Nine specialist agents — from research and strategy to weekly reports and 24/7 watchdogs.',
    description:
      'Branddock agents run real work on top of your brand DNA: market research with sources, strategy foundations, content proposals, brand-fit reviews and data analysis. Every agent proposes — you approve. Nothing ships without you.',
    bullets: [
      'Research analyst: sourced market research (web + peer-reviewed) into your knowledge library',
      'Strategist & content creator: strategy foundations and content proposals through the brand-validated pipeline',
      'Brand guardian: independent brand-fit reviews (F-VAL) on any text',
      'Reporting analyst: a client-ready weekly brand report, on schedule',
      'SEO/GEO & ads watchdogs: published content decay and ad-fatigue signals with refresh proposals',
      'Market & data analysts: competitor moves and your own production numbers',
      'Human-in-the-loop by design: agents propose, you confirm',
    ],
    screenshotPath: '/marketing/features/agents.png',
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
  if (!feature) return { title: 'Feature not found — Branddock' };
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
          {/* eslint-disable-next-line @next/next/no-img-element -- statische marketing-asset, geen next/image-optimalisatie nodig */}
          <img
            src={feature.screenshotPath}
            alt={`${feature.title} — product screenshot`}
            className="w-full h-auto"
          />
        </div>
      ) : null}

      <p className="text-gray-700 text-lg mb-8 leading-relaxed">{feature.description}</p>

      <h2 className="text-gray-900 mb-4">What you get</h2>
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
          Try Branddock
        </Link>
        <Link
          href="/marketing/pricing"
          className="inline-flex items-center px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
        >
          View pricing
        </Link>
      </div>
    </div>
  );
}
