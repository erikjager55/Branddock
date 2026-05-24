import type { Data } from '@puckeditor/core';
import type { PreviewContent } from '../../../types/canvas.types';
import type { CanvasContextStack } from '@/lib/ai/canvas-context';
import type { SpikePuckProps } from './puck-config';
import { resolveTemplateBuilder, type FilledFields } from './puck-templates';

type SpikeData = Data<SpikePuckProps>;

/**
 * Phase 3 seed-mapper from Canvas Step 2 variant output to an initial Puck
 * data-tree.
 *
 * Two stages:
 *  1. extractFilledFields: parses PreviewContent + CanvasContextStack into
 *     a normalised FilledFields shape (headline, sub, cta, features, etc.).
 *  2. resolveTemplateBuilder + builder(filled, ctx): picks the per-content-type
 *     template skeleton (landing-page / product-page / faq-page /
 *     comparison-page / microsite) and renders it filled with the extracted
 *     values; unknown content-types fall back to landing-page layout.
 */
export function variantToPuckData(
  previewContent: PreviewContent,
  ctx: CanvasContextStack | null,
): SpikeData {
  const filled = extractFilledFields(previewContent, ctx);
  const build = resolveTemplateBuilder(ctx?.deliverableTypeId);
  return build(filled, ctx);
}

/**
 * Pull every text-shaped field out of Step 2 variant-content and group them
 * by purpose. Falls back to ConceptContext + sensible defaults so templates
 * never receive empty strings (they render their own placeholders).
 *
 * Exported so smoke-tests + future phases can validate the extraction layer
 * separately from template-rendering.
 */
export function extractFilledFields(
  previewContent: PreviewContent,
  ctx: CanvasContextStack | null,
): FilledFields {
  const textEntries = Object.entries(previewContent).filter(
    ([, v]) => v.type === 'text' && v.content,
  );

  const find = (...needles: string[]): string | null =>
    textEntries.find(([key]) =>
      needles.some((n) => key.toLowerCase().includes(n)),
    )?.[1]?.content ?? null;

  const findAll = (...needles: string[]): string[] =>
    textEntries
      .filter(([key]) =>
        needles.some((n) => key.toLowerCase().includes(n)),
      )
      .map(([, v]) => v.content ?? '')
      .filter(Boolean);

  const headline = stripMarkers(
    find('headline', 'hero', 'title') ?? ctx?.concept?.campaignTheme ?? '',
  );
  const sub = stripMarkers(
    find('sub', 'description', 'value', 'tagline') ?? ctx?.concept?.positioningStatement ?? '',
  );
  const ctaLabel = stripMarkers(find('cta', 'button') ?? '').slice(0, 60);

  const featureItems = parseFeatureItems(findAll('feature', 'benefit'));
  const faqItems = parseFaqItems(findAll('faq', 'question'));
  const testimonialQuote = stripMarkers(find('testimonial', 'quote', 'social-proof') ?? '');
  const pricingTiers = parsePricingTiers(findAll('pricing', 'tier', 'plan'));
  const longText = stripMarkers(findAll('body', 'narrative', 'long', 'content').join('\n\n'));

  return {
    headline,
    sub,
    ctaLabel,
    ctaHref: '#',
    featureItems,
    faqItems,
    testimonialQuote,
    testimonialAuthor: '',
    pricingTiers,
    longText,
  };
}

/**
 * Markdown-style list parser. Accepts either a single string with
 * newline-separated items OR an array of strings (multiple variant groups).
 * Each item is split on " - " or ": " to derive title + description.
 */
function parseFeatureItems(rawLines: string[]): { title: string; description: string }[] {
  const items: { title: string; description: string }[] = [];
  for (const raw of rawLines) {
    const lines = raw
      .split('\n')
      .map((l) => l.replace(/^\s*[-*•]\s*/, '').trim())
      .filter(Boolean);
    for (const line of lines) {
      const stripped = stripMarkers(line);
      const sepIndex = stripped.indexOf(' - ');
      if (sepIndex > 0) {
        items.push({
          title: stripped.slice(0, sepIndex).trim(),
          description: stripped.slice(sepIndex + 3).trim(),
        });
      } else if (stripped.includes(': ')) {
        const [t, ...rest] = stripped.split(': ');
        items.push({ title: t.trim(), description: rest.join(': ').trim() });
      } else if (stripped.length > 0) {
        items.push({ title: stripped, description: '' });
      }
    }
  }
  return items.slice(0, 6);
}

function parseFaqItems(rawLines: string[]): { question: string; answer: string }[] {
  const items: { question: string; answer: string }[] = [];
  for (const raw of rawLines) {
    const blocks = raw.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    for (const block of blocks) {
      const stripped = stripMarkers(block);
      if (stripped.includes('?')) {
        const qEnd = stripped.indexOf('?');
        items.push({
          question: stripped.slice(0, qEnd + 1).trim(),
          answer: stripped.slice(qEnd + 1).trim() || 'TBD',
        });
      } else if (stripped.length > 0) {
        items.push({ question: stripped, answer: 'TBD' });
      }
    }
  }
  return items.slice(0, 6);
}

function parsePricingTiers(
  rawLines: string[],
): { name: string; price: string; features: string }[] {
  const tiers: { name: string; price: string; features: string }[] = [];
  for (const raw of rawLines) {
    const blocks = raw.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    for (const block of blocks) {
      const stripped = stripMarkers(block);
      const priceMatch = stripped.match(/(€|EUR|\$)\s?\d+[\d.,]*\s?(\/mnd|\/month|\/maand)?/i);
      if (priceMatch) {
        const price = priceMatch[0];
        const beforePrice = stripped.slice(0, priceMatch.index ?? 0).trim();
        const afterPrice = stripped.slice((priceMatch.index ?? 0) + price.length).trim();
        tiers.push({
          name: beforePrice.split('\n')[0] || 'Tier',
          price,
          features: afterPrice || 'Feature list TBD',
        });
      }
    }
  }
  return tiers.slice(0, 4);
}

function stripMarkers(text: string): string {
  return text
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}
