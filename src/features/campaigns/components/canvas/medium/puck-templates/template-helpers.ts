import type { CanvasContextStack } from '@/lib/ai/canvas-context';

/**
 * Filled fields extracted from Step 2 variant-content + concept context.
 * Templates consume this rather than the raw PreviewContent so each template
 * can pick the fields it cares about without re-running heuristics.
 *
 * Empty strings (rather than null) for missing values so the default Puck
 * components render their own placeholders rather than crashing on undefined.
 */
export interface FilledFields {
  headline: string;
  sub: string;
  ctaLabel: string;
  ctaHref: string;
  featureItems: { title: string; description: string }[];
  faqItems: { question: string; answer: string }[];
  testimonialQuote: string;
  testimonialAuthor: string;
  pricingTiers: { name: string; price: string; features: string }[];
  longText: string;
}

function instance(type: string, props: Record<string, unknown>) {
  return {
    type,
    props: { id: `${type}-${Math.random().toString(36).slice(2, 9)}`, ...props },
  };
}

// Fallback copy below must stay recognisably placeholder: no brand names,
// prices, policy claims or offer details that could pass for real content
// if it leaks onto a published customer page (anti-fabrication rule).

export function defaultBrandHero(f: FilledFields) {
  return instance('BrandHero', {
    headline: f.headline || 'Headline placeholder',
    sub: f.sub || 'Subtitle placeholder',
    ctaLabel: f.ctaLabel || 'Get started',
  });
}

export function defaultBrandCta(f: FilledFields, ctx: CanvasContextStack | null) {
  const personaId = ctx?.personas?.[0]?.id ?? '';
  return instance('BrandCTA', {
    label: f.ctaLabel || 'Learn more',
    href: f.ctaHref || '#',
    personaId,
  });
}

export function defaultFeatureGrid(f: FilledFields) {
  const features = f.featureItems.length > 0
    ? f.featureItems
    : [
        { title: 'Fast', description: 'Describe the speed benefit here — replace with real content.' },
        { title: 'Simple', description: 'Describe the ease of use here — replace with real content.' },
        { title: 'Scalable', description: 'Describe the scalability here — replace with real content.' },
      ];
  const columns = features.length >= 4 ? '4' : features.length === 2 ? '2' : '3';
  return instance('FeatureGrid', { columns, features });
}

export function defaultFaq(f: FilledFields) {
  const items = f.faqItems.length > 0
    ? f.faqItems
    : [
        { question: 'How does it work?', answer: 'Placeholder — replace with the real answer.' },
        { question: 'What does it cost?', answer: 'Placeholder — replace with the real answer.' },
        { question: 'Can I cancel?', answer: 'Placeholder — replace with the real answer.' },
      ];
  return instance('FAQ', { items });
}

export function defaultTestimonial(f: FilledFields, ctx: CanvasContextStack | null) {
  const personaId = ctx?.personas?.[0]?.id ?? '';
  return instance('Testimonial', {
    quote: f.testimonialQuote || '"Quote from a happy customer — replace with a real review."',
    author: f.testimonialAuthor || 'Customer name, Company',
    personaId,
  });
}

export function defaultPricingTable(f: FilledFields) {
  const tiers = f.pricingTiers.length > 0
    ? f.pricingTiers
    : [
        { name: 'Starter', price: '€ —', features: 'Replace with real features\nOne feature per line' },
        { name: 'Pro', price: '€ —', features: 'Replace with real features\nOne feature per line' },
        { name: 'Enterprise', price: '€ —', features: 'Replace with real features\nOne feature per line' },
      ];
  return instance('PricingTable', { tiers });
}

export function defaultRichText(f: FilledFields) {
  return instance('RichText', {
    content: f.longText || 'Add extra context, background, or differentiator details here.',
  });
}

export function defaultFooter(_f: FilledFields, ctx: CanvasContextStack | null) {
  const brandName = ctx?.brand?.brandName ?? 'Brand Name';
  return instance('Footer', {
    companyName: brandName,
    tagline: 'Short tagline',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'Contact', href: '/contact' },
    ],
  });
}
