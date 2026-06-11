import type { Data } from '@puckeditor/core';
import type { PreviewContent } from '../../../types/canvas.types';
import type { CanvasContextStack } from '@/lib/ai/canvas-context';
import type { SpikePuckProps } from './puck-config';
import { resolveTemplateBuilder, type FilledFields } from './puck-templates';
import { buildLandingPageTemplateFromStructured, resolveCtaHref } from './puck-templates/landing-page-from-structured';
import type { LandingPageVariantContent } from '@/lib/landing-pages/variant-schema';

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

  // Contract-aware extraction (prompt-audit Fase 2): faq-page / microsite /
  // comparison-page emit numbered contract groups the needle heuristics
  // can't pair (question-N/answer-N) or even see (page-N). Contract values
  // win per-field; the needle/blob fallback keeps handling everything else.
  const contract = extractContractFields(textEntries, ctx?.deliverableTypeId ?? null);

  const headline = stripMarkers(
    find('headline', 'hero', 'title')
      ?? blobParse?.headline
      ?? ctx?.concept?.campaignTheme
      ?? '',
  );
  const sub = contract.sub ?? stripMarkers(
    find('sub', 'description', 'value', 'tagline')
      ?? blobParse?.sub
      ?? ctx?.concept?.positioningStatement
      ?? '',
  );
  const ctaLabel = stripMarkers(find('cta', 'button') ?? blobParse?.ctaLabel ?? '').slice(0, 60);

  const keyedFeatures = parseFeatureItems(findAll('feature', 'benefit'));
  const featureItems = contract.featureItems
    ?? (keyedFeatures.length > 0 ? keyedFeatures : (blobParse?.featureItems ?? []));

  const keyedFaq = parseFaqItems(findAll('faq', 'question'));
  const faqItems = contract.faqItems
    ?? (keyedFaq.length > 0 ? keyedFaq : (blobParse?.faqItems ?? []));

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
  // Contract longText skips the cap: clamping would re-introduce exactly the
  // page-2..5 loss the contract path fixes, and the per-group storage caps
  // (max 2500 chars/group) already bound it.
  const longText = contract.longText ?? (longTextRaw.length > 1500
    ? longTextRaw.slice(0, 1497) + '…'
    : longTextRaw);

  return {
    headline,
    sub,
    ctaLabel,
    ctaHref: resolveCtaHref(ctx),
    featureItems,
    faqItems,
    testimonialQuote,
    testimonialAuthor: '',
    pricingTiers,
    longText,
  };
}

/** Text-shaped previewContent entry as produced by extractFilledFields. */
type TextEntry = readonly [string, PreviewContent[string]];

/**
 * Contract-aware extraction for the Fase 2 web-page group contracts
 * (component-templates-fallback.ts):
 *
 *  - faq-page: zip question-N with answer-N (paired on number) into
 *    faqItems — the substring needle `question` only matched the questions,
 *    so every answer rendered as "TBD". The intro group becomes the hero sub.
 *  - microsite: concatenate page-1..page-5 in numeric order into longText —
 *    the blob fallback only kept the single longest page, losing the rest.
 *  - comparison-page: intro → hero sub, differentiator-N → FeatureGrid
 *    items, comparison-matrix + switching-guide + summary → the RichText
 *    block (markdown preserved — the matrix is a markdown table).
 *
 * Returns per-field overrides; empty object when the deliverable type isn't
 * a contract type or the contract groups are absent (legacy variants), so
 * the existing needle/blob fallback stays authoritative for everything else.
 */
function extractContractFields(
  textEntries: ReadonlyArray<TextEntry>,
  deliverableTypeId: string | null,
): Partial<FilledFields> {
  const exact = (key: string): string | null =>
    textEntries.find(([k]) => k.toLowerCase() === key)?.[1]?.content ?? null;

  if (deliverableTypeId === 'faq-page') {
    const questions = numberedGroups(textEntries, /^question-(\d+)$/);
    if (questions.length === 0) return {};
    const answersByNumber = new Map(numberedGroups(textEntries, /^answer-(\d+)$/));
    const faqItems = questions.map(([n, question]) => ({
      question: stripMarkers(question),
      // Pairs zip on number (answer-3 answers question-3) — a missing half
      // renders as TBD instead of shifting the remaining answers up.
      answer: stripMarkers(answersByNumber.get(n) ?? '') || 'TBD',
    }));
    const intro = exact('intro');
    return intro ? { faqItems, sub: stripMarkers(intro) } : { faqItems };
  }

  if (deliverableTypeId === 'microsite') {
    const pages = numberedGroups(textEntries, /^page-(\d+)$/);
    if (pages.length === 0) return {};
    return { longText: pages.map(([, content]) => content).join('\n\n') };
  }

  if (deliverableTypeId === 'comparison-page') {
    const out: Partial<FilledFields> = {};
    const intro = exact('intro');
    if (intro) out.sub = stripMarkers(intro);
    const differentiators = numberedGroups(textEntries, /^differentiator-(\d+)$/);
    if (differentiators.length > 0) {
      out.featureItems = differentiators.map(([, content]) => splitTitleDescription(content));
    }
    const longParts = [exact('comparison-matrix'), exact('switching-guide'), exact('summary')]
      .filter((part): part is string => Boolean(part));
    if (longParts.length > 0) out.longText = longParts.join('\n\n');
    return out;
  }

  return {};
}

/**
 * Collect numbered contract groups (`question-N`, `page-N`, …) as
 * [number, content] pairs sorted ascending by N. Gaps are allowed — the
 * contracts let the AI skip optional slots.
 */
function numberedGroups(
  textEntries: ReadonlyArray<TextEntry>,
  pattern: RegExp,
): [number, string][] {
  const byNumber = new Map<number, string>();
  for (const [key, value] of textEntries) {
    const m = pattern.exec(key.toLowerCase().trim());
    if (m && value.content) byNumber.set(Number(m[1]), value.content);
  }
  return [...byNumber.entries()].sort(([a], [b]) => a - b);
}

/**
 * Split a single-paragraph contract group (differentiator-N) into a
 * FeatureGrid card: first sentence as title, remainder as description —
 * the contract has no separate title/body halves for these groups.
 */
function splitTitleDescription(raw: string): { title: string; description: string } {
  const stripped = stripMarkers(raw).replace(/\s+/g, ' ').trim();
  const end = stripped.search(/(?<=[.!?])\s/);
  if (end === -1) return { title: stripped, description: '' };
  return {
    title: stripped.slice(0, end).trim(),
    description: stripped.slice(end + 1).trim(),
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

// ────────────────────────────────────────────────────────────
// Fase 3 — Structured variant entry point
// ────────────────────────────────────────────────────────────

/**
 * Fase 3 entry voor structured-variant flow (docs/specs/web-page-types/
 * landing-page.md §4b). Bypasst heuristic FilledFields-extractie en
 * mapt direct van LandingPageVariantContent naar Puck-tree.
 *
 * Caller is verantwoordelijk voor het valideren van de variant via
 * validateLandingPageVariant() vóór deze functie aan te roepen.
 *
 * Naast variantToPuckData (legacy markdown-blob route) — wiring beslist
 * welke route gebruikt wordt op basis van of de variant gestructureerd is.
 * Die dispatch komt in Fase 5 of bij de canvas-orchestrator integratie.
 */
export function variantToPuckDataFromStructured(
  variant: LandingPageVariantContent,
  ctx: CanvasContextStack | null,
): SpikeData {
  return buildLandingPageTemplateFromStructured(variant, ctx);
}
