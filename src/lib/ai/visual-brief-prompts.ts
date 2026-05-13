/**
 * Shared mapping from Visual Brief style chips to concrete prompt-side
 * instructions. Used by:
 *
 *   1. canvas-orchestrator.ts — to inject image-side composition rules into
 *      the imagePrompt builder when text-gen runs (legacy path, currently
 *      unused server-side but kept wired).
 *
 *   2. /api/studio/[id]/generate-visual — to build the actual image prompts
 *      that go to Imagen / DALL-E / fal.ai when the user clicks the
 *      "Generate visual" button on Canvas Step 2.
 *
 * Both call sites need the same chip → instruction translation; centralising
 * it here keeps them in sync without bouncing through canvas-orchestrator's
 * internals.
 */

import type {
  PersonaContext,
  ProductContext,
  VisualBrief,
  VisualStyleDirection,
} from './canvas-context';
import type { BrandContextBlock } from './prompt-templates';

const SUBJECT_FIELD_MAX_CHARS = 200;

function truncate(str: string | null | undefined, max = SUBJECT_FIELD_MAX_CHARS): string {
  if (!str) return '';
  const trimmed = str.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

interface SubjectContext {
  keyMessage: string | null;
  objective: string | null;
  callToAction?: string | null;
  /** Personas linked to this deliverable; first one used as primary subject when chip needs a person. */
  personas?: PersonaContext[];
  /** Products linked to this deliverable; first one used for product-shot chip. */
  products?: ProductContext[];
  /** From ConceptContext.creativePlatform — campaign theme. */
  creativePlatform?: string | null;
  /** From MediumContext.platform — e.g. 'linkedin'. */
  platform?: string | null;
  /** Aspect ratio hint for the prompt — purely cosmetic, the route passes the actual aspect-ratio to the model API. */
  aspectRatio?: string | null;
  /** Brand fallback when subject can't be built. */
  brandName?: string | null;
}

/**
 * Build the subject seed per chip. Returns a concrete sentence the image
 * generator can ground on. Each branch falls back gracefully when the
 * preferred context is missing (e.g. product-shot without a product →
 * brand-name + warning).
 *
 * Persona handling: uses `name` + the first 200 chars of `serialized`
 * (which contains the demographics + occupation block from
 * persona-serializer.ts). Personas in B2B SaaS are fictional, so name is
 * safe to use; the serialized chunk surfaces age / occupation / setting
 * the AI can use.
 */
function buildSubjectByChip(
  chip: VisualStyleDirection | null,
  ctx: SubjectContext,
): string {
  const persona = ctx.personas?.[0];
  const product = ctx.products?.[0];
  const personaContext = persona
    ? `${persona.name} — ${truncate(persona.serialized, 200)}`
    : null;

  switch (chip) {
    case 'lifestyle':
    case 'ugc':
      return personaContext && product
        ? `${personaContext}, using ${product.name}${product.category ? ` (${product.category})` : ''}`
        : personaContext
          ? personaContext
          : product
            ? `Person interacting with ${product.name}${product.category ? ` (${product.category})` : ''}`
            : (truncate(ctx.keyMessage) || `Brand visual for ${ctx.brandName ?? 'the brand'}`);

    case 'product-shot':
      if (product) {
        const featureSnippet = product.features?.[0] ? ` — ${truncate(product.features[0], 80)}` : '';
        return `${product.name}${product.category ? ` (${product.category})` : ''}${featureSnippet}, hero composition`;
      }
      // Explicit warning for product-shot without product — pilot guardrail
      console.warn('[visual-brief-prompts] product-shot chip selected without a linked product; falling back to brand visual');
      return truncate(ctx.keyMessage) || `Brand visual for ${ctx.brandName ?? 'the brand'}`;

    case 'behind-the-scenes':
      return personaContext
        ? `Behind the scenes: ${personaContext} at work`
        : (truncate(ctx.keyMessage) || `Behind the scenes at ${ctx.brandName ?? 'the brand'}`);

    case 'quote-text': {
      const quote = ctx.callToAction || ctx.keyMessage;
      return quote ? `Typography hero featuring: "${truncate(quote, 150)}"` : `Brand quote for ${ctx.brandName ?? 'the brand'}`;
    }

    case 'infographic':
    case 'data-driven':
      return truncate(ctx.keyMessage) || `Data visualization for ${ctx.brandName ?? 'the brand'}`;

    case 'illustration':
      return truncate(ctx.keyMessage) || (product ? `Illustrated metaphor for ${product.name}` : `Illustration for ${ctx.brandName ?? 'the brand'}`);

    default:
      // No chip: rich fallback if context available, else simple keyMessage
      return personaContext && product
        ? `${personaContext}, with ${product.name}`
        : (truncate(ctx.keyMessage) || truncate(ctx.objective) || `Brand visual for ${ctx.brandName ?? 'the brand'}`);
  }
}

/**
 * Smart model selection per style chip — picks the model whose strengths
 * align with what the chip needs most. The order respects cost-awareness:
 * cheaper models (FLUX.2 Pro at $0.03/MP) are preferred when their
 * quality is "good enough"; we splurge on GPT Image 2 ($0.21/img high)
 * only when text rendering or product-packaging accuracy is structurally
 * critical to the chip.
 *
 * Vendors:
 * - openai/gpt-image-2  — SOTA photoreal + pixel-perfect text
 * - fal-ai/flux-2-pro   — best photoreal at value pricing
 * - fal-ai/recraft-v3   — purpose-built for vector / brand design
 *
 * Override path: visualBrief.generate.model wins over the default in
 * the endpoint. This map fires only when the user hasn't explicitly
 * picked a model.
 */
export function selectModelForStyle(chip: VisualStyleDirection | null): string {
  switch (chip) {
    case 'quote-text':
    case 'infographic':
    case 'data-driven':
      // Text rendering is THE feature — GPT Image 2 is best in class
      return 'openai/gpt-image-2';
    case 'product-shot':
      // Product shots commonly include brand text on packaging / labels
      // — GPT Image 2's text accuracy avoids the usual "garbled logo" issue
      return 'openai/gpt-image-2';
    case 'illustration':
      // Vector / drawn style — Recraft V3 is purpose-built; GPT Image 2
      // and FLUX bias toward photoreal which fights the brief
      return 'fal-ai/recraft-v3';
    case 'lifestyle':
    case 'behind-the-scenes':
    case 'ugc':
      // Photoreal scenes without critical text — FLUX.2 Pro hits the
      // quality bar at ~7× lower cost than GPT Image 2 high
      return 'fal-ai/flux-2-pro';
    default:
      // No chip picked — pick the safe photoreal default
      return 'fal-ai/flux-2-pro';
  }
}

export const VISUAL_STYLE_IMAGE_INSTRUCTIONS: Record<VisualStyleDirection, string> = {
  lifestyle:
    'Lifestyle photography: real people in authentic situations using the product/service. Natural lighting, candid composition, environmental context. Avoid posed studio shots.',
  'product-shot':
    'Clean product photography: isolated subject on simple background, controlled studio lighting, hero composition. Focus is the product itself with crisp details.',
  'quote-text':
    'Typography-led design: large quote / phrase as the focal point. Brand colors for accent. Minimal supporting imagery. Geometric or solid background.',
  'behind-the-scenes':
    'Documentary photography: candid team / workspace / process shots. Available light, slight grain, real moments. Not glossy or staged.',
  ugc: 'User-generated style: handheld phone composition, natural light, slight imperfection. Authentic and unpolished. Avoid professional studio polish.',
  infographic:
    'Information graphic: data viz, icons, structured layout. Clear visual hierarchy. Brand colors for accent on data points. Minimal decoration.',
  illustration:
    'Illustrated artwork: drawn or vector style. Confident lines, on-brand color palette. Can be conceptual / metaphorical. Not photorealistic.',
  'data-driven':
    'Editorial chart-led layout: prominent data viz (chart/graph) as the hero. Headline number large. Minimal accompanying decoration. Magazine-quality.',
};

/**
 * Compact brand-visual identity stub for prompt injection. Pulls only the
 * fields that affect image composition (colors, photography style, design
 * language). Returns an empty string when nothing is set.
 */
export function formatBrandVisualIdentity(brand: BrandContextBlock): string {
  const parts = [
    brand.brandColors ? `Brand colors: ${brand.brandColors}` : '',
    brand.brandImageryStyle ? `Imagery style: ${brand.brandImageryStyle}` : '',
    brand.brandVisualSystem
      ? `Visual system: ${brand.brandVisualSystem}`
      : brand.brandDesignLanguage
        ? `Design language: ${brand.brandDesignLanguage}`
        : '',
  ].filter(Boolean);
  return parts.join('. ');
}

/**
 * Build N distinct image prompts from a Visual Brief + brand context +
 * subject hints. Used when the user explicitly triggers "Generate visual"
 * on Step 2 — produces 2 variations the user can pick between.
 *
 * The variation is structural rather than stylistic: prompt A is a
 * close-up / direct take on the subject, prompt B is a wider /
 * environmental composition. Both inherit the same chip mapping +
 * brand identity so they stay on-brand but feel distinct.
 */
export function buildVisualBriefImagePrompts(
  brief: VisualBrief,
  brand: BrandContextBlock,
  subject: SubjectContext,
  count = 2,
): string[] {
  const chip = brief.styleDirection;
  const styleInstruction = chip ? VISUAL_STYLE_IMAGE_INSTRUCTIONS[chip] : '';
  const freeText = brief.styleDirectionFreeText?.trim() ?? '';
  const visualIdentity = formatBrandVisualIdentity(brand);

  // Subject seed — explicit briefing-text overrules everything (user
  // wrote / AI suggested concrete subject). Otherwise chip-aware build
  // from personas/products/keyMessage. See canvas-image-briefing-textarea
  // task — `briefingText` exists to give users a single source of truth
  // for "what should the image depict" without parsing it out of style hints.
  const explicitBriefing = brief.briefingText?.trim();
  const subjectSeed = explicitBriefing && explicitBriefing.length > 0
    ? explicitBriefing
    : buildSubjectByChip(chip, {
        ...subject,
        brandName: subject.brandName ?? brand.brandName ?? null,
      });

  // F36 (audit 2026-05-13): CTA-text NIET meer als gequote string in image-
  // prompt. Voorheen leverde dat text-overlay hallucinations: image-model
  // (Imagen/DALL-E/FLUX) zag de quoted CTA als instructie om die letterlijk
  // op de image te renderen. Resultaat: blog-image met overlay "Plan a free
  // consultation to discover how we can relieve yourtextile management
  // concerns" — Engels op een Nederlandse blog, plus typo. Block volledig
  // verwijderd; image-model krijgt geen CTA-context meer. Subject + style
  // + visual-identity zijn voldoende voor passende image-keuze.
  const platformBlock = subject.platform
    ? `Intended for ${subject.platform}${subject.aspectRatio ? ` (${subject.aspectRatio})` : ''}.`
    : '';
  const themeBlock = subject.creativePlatform
    ? `Campaign theme: ${truncate(subject.creativePlatform, 150)}.`
    : '';

  // F36: hard no-text directive — voorkomt text-overlay hallucinations
  // bij image-models die anders captions/signage zelf invullen.
  const noTextDirective =
    'CRITICAL: Absolutely no text, no captions, no signage, no typography, no words, no letters overlaid on the image anywhere. Photographic content only — pure visual storytelling without any embedded text.';

  // Two compositional angles per chip — "close" focuses on the subject;
  // "wide" pulls back for environmental context. Both same chip, same
  // brand, different framing.
  const angles = [
    'Close composition: subject prominent, fills most of the frame.',
    'Wider composition: subject in environmental context with negative space.',
    'Detail-focused: tight crop on the most expressive element.',
  ];

  const promptCount = Math.max(1, Math.min(count, angles.length));
  const prompts: string[] = [];
  for (let i = 0; i < promptCount; i++) {
    const parts = [
      styleInstruction,
      `Subject: ${subjectSeed}.`,
      platformBlock,
      themeBlock,
      angles[i],
      freeText,
      visualIdentity,
      noTextDirective,
    ].filter(Boolean);
    prompts.push(parts.join(' '));
  }
  return prompts;
}
