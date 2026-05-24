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
 * Two-pass strategy:
 *  1. Keyed lookup — variant-groups die headline/sub/feature/etc. heten
 *     worden direct gemapped (snelle path voor gestructureerde generators).
 *  2. Markdown-blob fallback — wanneer de keyed lookup leeg blijft maar er
 *     wel een lange tekst-blob is (typisch SEO-pipeline output: één variant
 *     met "BODY" key + complete markdown-article van 500+ woorden), parse
 *     die als markdown article en extract headline / sub / features /
 *     FAQ-items / longText. Lost het Phase 6.4 issue op waar landing-page
 *     deliverables alleen placeholder-tekst zagen omdat de SEO-output niet
 *     de verwachte keyed-shape had.
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

  // Markdown-blob fallback: parse the longest variant content as a full
  // article when no structured keys match. SEO pipelines write everything
  // into one "body" group; without this fallback the user only saw
  // template-default placeholders in Step 3.
  const longestBlob = textEntries
    .map(([, v]) => v.content ?? '')
    .filter((s) => s.length >= 300)
    .sort((a, b) => b.length - a.length)[0] ?? null;
  const blobParse = longestBlob ? parseMarkdownArticle(longestBlob) : null;

  const headline = stripMarkers(
    find('headline', 'hero', 'title')
      ?? blobParse?.headline
      ?? ctx?.concept?.campaignTheme
      ?? '',
  );
  const sub = stripMarkers(
    find('sub', 'description', 'value', 'tagline')
      ?? blobParse?.sub
      ?? ctx?.concept?.positioningStatement
      ?? '',
  );
  const ctaLabel = stripMarkers(find('cta', 'button') ?? blobParse?.ctaLabel ?? '').slice(0, 60);

  const keyedFeatures = parseFeatureItems(findAll('feature', 'benefit'));
  const featureItems = keyedFeatures.length > 0
    ? keyedFeatures
    : (blobParse?.featureItems ?? []);

  const keyedFaq = parseFaqItems(findAll('faq', 'question'));
  const faqItems = keyedFaq.length > 0
    ? keyedFaq
    : (blobParse?.faqItems ?? []);

  const testimonialQuote = stripMarkers(
    find('testimonial', 'quote', 'social-proof')
      ?? blobParse?.testimonialQuote
      ?? '',
  );
  const pricingTiers = parsePricingTiers(findAll('pricing', 'tier', 'plan'));
  const longTextRaw = stripMarkers(
    findAll('body', 'narrative', 'long', 'content').join('\n\n')
    || blobParse?.longText
    || '',
  );
  // Cap longText at 1500 chars so a SEO-pipeline 2000-woorden article doesn't
  // overwhelm the RichText component default; truncation marker signals the
  // user that the source content is longer than what landed in the page.
  const longText = longTextRaw.length > 1500
    ? longTextRaw.slice(0, 1497) + '…'
    : longTextRaw;

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
 * Parse a markdown-blob variant (typical SEO-pipeline output) into a
 * partial FilledFields. Heuristics:
 *
 *  - First H1/H2/H3 line → headline.
 *  - First non-header paragraph after the headline → sub (max 2 sentences).
 *  - All subsequent H2-H4 sections become:
 *      - FAQ items when the title ends with "?" (max 6)
 *      - FeatureGrid items otherwise (max 6, title + first sentence of body)
 *  - First blockquote (line starting with ">") → testimonialQuote.
 *  - Whole blob → longText fallback.
 *
 * Pure function — testable without DB / React rendering.
 */
function parseMarkdownArticle(text: string): Partial<FilledFields> {
  const lines = text.split('\n').map((l) => l.replace(/\s+$/, ''));

  let headlineIdx = -1;
  let headline = '';
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^#{1,4}\s+(.+)$/);
    if (m) {
      const candidate = m[1].trim();
      // Skip generic section labels like "BODY", "INTRO" — those are
      // SEO-pipeline placeholder headers, not the actual page title.
      if (/^[A-Z]{3,}$/.test(candidate)) continue;
      headline = candidate;
      headlineIdx = i;
      break;
    }
  }

  let sub = '';
  if (headlineIdx >= 0) {
    for (let i = headlineIdx + 1; i < Math.min(lines.length, headlineIdx + 12); i++) {
      const trimmed = lines[i].trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('#') || trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('>')) {
        continue;
      }
      const sentences = trimmed.split(/(?<=[.!?])\s+/).slice(0, 2).join(' ');
      sub = sentences.length > 200 ? sentences.slice(0, 197) + '…' : sentences;
      break;
    }
  }

  const sections: { title: string; body: string }[] = [];
  let current: { title: string; body: string } | null = null;
  for (const line of lines) {
    const m = line.match(/^#{2,4}\s+(.+)$/);
    if (m) {
      if (current) sections.push(current);
      const title = m[1].trim();
      if (/^[A-Z]{3,}$/.test(title)) {
        current = null;
        continue;
      }
      current = { title, body: '' };
    } else if (current) {
      current.body += line + '\n';
    }
  }
  if (current) sections.push(current);

  const headlineSection = sections.findIndex((s) => s.title === headline);
  const remaining = headlineSection >= 0
    ? sections.slice(headlineSection + 1)
    : sections;

  const faqItems = remaining
    .filter((s) => s.title.endsWith('?'))
    .slice(0, 6)
    .map((s) => ({
      question: s.title,
      answer: firstSentence(s.body) || 'TBD',
    }));

  const featureItems = remaining
    .filter((s) => !s.title.endsWith('?'))
    .slice(0, 6)
    .map((s) => ({
      title: s.title,
      description: firstSentence(s.body) || '',
    }));

  let testimonialQuote = '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('>')) {
      testimonialQuote = trimmed.replace(/^>\s*/, '').slice(0, 220);
      break;
    }
  }

  return {
    headline,
    sub,
    ctaLabel: '',
    featureItems,
    faqItems,
    testimonialQuote,
    longText: text.slice(0, 1500),
  };
}

function firstSentence(text: string): string {
  const cleaned = stripMarkers(text.trim());
  if (!cleaned) return '';
  const sentence = cleaned.split(/(?<=[.!?])\s+/)[0] ?? cleaned;
  return sentence.length > 160 ? sentence.slice(0, 157) + '…' : sentence;
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
