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
import { buildNegativePrompt } from './image-quality/negative-prompts';

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
  // F38 (audit 2026-05-13): intent-based routing op basis van eigen
  // onderzoek 2026 naar SOTA image-models. Mapping:
  //   - text-heavy (quote/infographic/data) → Nano Banana Pro
  //     (best text-rendering per onafhankelijke comparisons; 10× cheaper
  //      dan GPT Image 2)
  //   - product-shot → Seedream V4 (text-in-product specialist)
  //   - illustration → Recraft V3 (design-forward)
  //   - photoreal scenes → FLUX 2 Pro (aesthetic photoreal)
  //   - default → FLUX 2 Pro
  // Override-path: visualBrief.generate.model wint over deze default.
  switch (chip) {
    case 'quote-text':
      // F42-final-2 (audit 2026-05-15): all-chips experiment toonde
      // Ideogram V3 composite 78 vs Nano Banana 69 voor typography-poster
      // briefs. Typography-specialist > generalist op deze chip.
      return 'fal-ai/ideogram-v3';
    case 'infographic':
    case 'data-driven':
      // Marginaal verschil tussen Ideogram (83) en Nano Banana (82); Nano
      // Banana wint op brandFit (88 vs 75) en is $0.02 cheaper. Keep.
      return 'fal-ai/nano-banana-pro';
    case 'product-shot':
      // Product shots met tekst op packaging/labels — Seedream V4 is
      // specialist in readable in-image text + product realism.
      return 'fal-ai/seedream-v4-5';
    case 'illustration':
      // F42-final (audit 2026-05-14): switch illustration → Nano Banana Pro.
      // Eigen head-to-head experiment 2026-05-14 toonde Nano Banana Pro
      // composite 88 vs Recraft V3 digital_illustration 60 op identieke
      // brief. Recraft produceerde wel goede style-match (88) maar
      // catastrofale embedded-text (noText score 5). Nano Banana levert
      // illustration + tekstvrij + sterke brandFit, plus 50% goedkoper
      // ($0.02 vs $0.04). Recraft blijft beschikbaar via override.
      return 'fal-ai/nano-banana-pro';
    case 'lifestyle':
    case 'behind-the-scenes':
    case 'ugc':
      // F42-final-2 (audit 2026-05-15): all-chips experiment toonde
      // Phota composite 87 vs FLUX 2 Pro 77 op photoreal-with-people
      // briefs. Phota is photoreal specialist met sterkere brand-fit
      // (88) en authenticity (85) voor warm/professional scenes.
      return 'fal-ai/phota';
    default:
      // No chip picked — FLUX 2 Pro blijft safe photoreal default voor
      // generic gevallen (Phota over-specialiseert in candid people).
      return 'fal-ai/flux-2-pro';
  }
}

export const VISUAL_STYLE_IMAGE_INSTRUCTIONS: Record<VisualStyleDirection, string> = {
  lifestyle:
    'Lifestyle photography: real people interacting with the brand\'s actual product or service touchpoint. The deliverable MUST be visible and central — if the brand delivers textile/linen service, show clean folded linen, fresh aprons, or stacked towels in the scene; if it sells food, the food is the subject; if it provides software, the laptop screen is the focal point. Generic action shots without a brand-touchpoint are wrong. Natural lighting, candid composition, environmental context. Avoid posed studio shots.',
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

/** Resultaat van `buildVisualBriefImagePrompts`. */
export interface VisualBriefImagePromptBundle {
  /** N distinct positive prompts (close / wide / detail). */
  prompts: string[];
  /** Negative prompt — defaults + workspace imageryDonts. Lege string als geen negatives van toepassing. */
  negativePrompt: string;
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
 *
 * Returns `{ prompts, negativePrompt }` (Pattern A image-quality-chain).
 * Provider-laag bepaalt of negativePrompt als native parameter (FAL Flux)
 * of als prompt-text directive (Gemini Image) wordt gestuurd.
 */
export function buildVisualBriefImagePrompts(
  brief: VisualBrief,
  brand: BrandContextBlock,
  subject: SubjectContext,
  count = 2,
): VisualBriefImagePromptBundle {
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

  // F36: hard no-text directive — voorkomt text-overlay hallucinations.
  // Korte variant (eerst, voor truncation-resistance) + lange variant
  // (achteraan, voor model-met-meer-budget).
  const noTextShort = 'NO TEXT IN IMAGE. NO captions, signage, typography, words or letters anywhere.';
  const noTextLong =
    'Pure visual storytelling without any embedded text — no captions, no signage, no typography overlays.';

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
    // F42e (audit 2026-05-14): prompt-ordening na issue met truncation +
    // weak brand-look. Essentiële guards (style, no-text, visual-identity)
    // eerst — die overleven de 1000-char truncation. Optionele context
    // (platform, theme, freeText) gaat achteraan en mag wegvallen.
    const parts = [
      styleInstruction,            // ~150-200 chars
      noTextShort,                 // ~80 chars — guard #1 binnen budget
      visualIdentity,              // ~150 chars — brand-look signaal vooraan
      `Subject: ${subjectSeed}.`,  // 400+ chars (de echte content)
      angles[i],                   // ~80 chars
      freeText,                    // ~200 chars (optioneel)
      platformBlock,               // ~50 chars (optioneel)
      themeBlock,                  // ~100 chars (optioneel)
      noTextLong,                  // herhaling van guard voor lange-prompt modellen
    ].filter(Boolean);
    prompts.push(parts.join(' '));
  }

  // Pattern A image-quality-chain: build negative-prompt uit defaults +
  // workspace imageryDonts. Stuurt naar provider-laag via native parameter
  // (FAL) of prompt-text directive (Gemini).
  const negativePrompt = buildNegativePrompt({
    brandImageryDonts: brand.brandImageryDonts,
  });

  return { prompts, negativePrompt };
}
