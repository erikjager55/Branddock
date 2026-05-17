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
import { suggestImageApproach, MODEL_META } from './image-suggestion';

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
/**
 * Server-side fal-slug picker. Reads from the same MODEL_META map that
 * the Step-1 suggestion banner uses (Layer 1), so the banner cannot
 * recommend "Nano Banana 2" while the generator silently routes to a
 * different model. The suggestion engine (suggestImageApproach) carries
 * the full decision tree (chip + LoRA + content-type). When the caller
 * has content-type / LoRA-info, pass it through for accurate routing;
 * otherwise the chip-only call still gives the right default per chip.
 *
 * Override-path: visualBrief.generate.model still wins over this default
 * — the endpoint reads that first before calling selectModelForStyle.
 */
export function selectModelForStyle(
  chip: VisualStyleDirection | null,
  options?: { contentTypeId?: string | null; hasTrainedLora?: boolean },
): string {
  const suggestion = suggestImageApproach({
    contentTypeId: options?.contentTypeId ?? null,
    styleDirection: chip,
    hasTrainedLora: options?.hasTrainedLora ?? false,
  });
  return MODEL_META[suggestion.modelId].falSlug;
}

// Chip-specific angle-sets — each chip gets 3 polarised composition
// alternatives so variant A and B can diverge meaningfully within the
// chip's own visual language instead of getting a generic "product-hero"
// directive for typography or infographic briefs.
const ANGLE_SETS: Record<VisualStyleDirection, string[]> = {
  lifestyle: [
    'Product-as-hero composition: the brand deliverable is the focal point as a still-life or detail shot — clean staging, minimal human presence (hands at edge of frame at most). Intentional negative space. NO portrait pose facing camera.',
    'Human-interaction composition: real candid scene of customer or staff USING the deliverable mid-action — pouring, folding, plating, swiping, serving. Caught moment, not a posed portrait. Wide enough to see environment and interaction together.',
    'Atmosphere composition: environmental wide shot showing the place at a specific moment (early morning prep, golden-hour service, after-close stillness). No primary subject; the place tells the story through light, layout, and texture.',
  ],
  'behind-the-scenes': [
    'Process detail: tight shot of hands at work — kneading, folding, sorting, prepping. The doing itself is the subject, faces partially out of frame.',
    'Team-in-action wide shot: 2-3 people coordinating in a real workspace, not posed. Available light, mid-task energy. Each person clearly doing something different.',
    'Workspace-after-hours: empty room post-shift with traces of the work (folded stacks, clean stations, tools at rest). Quiet documentary tone.',
  ],
  ugc: [
    'Phone-camera selfie POV: slight tilt, mid-conversation candor, natural indoor lighting, one person interacting with the product.',
    'Over-the-shoulder phone shot: user looking at the product on a counter or table, casual environment in background, slightly imperfect framing.',
    'Hand-held mid-action: motion-blur acceptable, product mid-use (pouring, applying, opening), authentic and slightly unpolished.',
  ],
  'product-shot': [
    'Three-quarter studio composition: product centered, soft shadow, clean seamless background, controlled key + fill lighting. Hero pose.',
    'Top-down flat-lay: product surrounded by 2-3 contextual props (ingredients, packaging, complementary items) on a textured surface. Editorial styling.',
    'Macro detail crop: extreme close-up on a single material, texture, or feature of the product. Shallow depth of field, focus on craftsmanship.',
  ],
  'quote-text': [
    'Centered hero typography: quote occupies 60-70% of frame, single solid brand-color background, modern sans-serif. Type-only design, no supporting imagery.',
    'Asymmetric layout: quote split across the frame with a strong off-center break, accent color block on one side. Editorial-magazine feel.',
    'Full-bleed typographic poster: quote fills the entire frame edge-to-edge, large display weight, subtle texture or gradient background. Statement piece.',
  ],
  illustration: [
    'Literal conceptual illustration: drawn or vector depiction of the subject directly. Confident line work, brand-color palette, no photorealism.',
    'Metaphorical illustration: a visual metaphor or analogy for the message (a journey, a bridge, a key, etc.). Symbolic rather than literal.',
    'Abstract pattern composition: shapes, gradients, and geometric forms that evoke the brand mood without depicting a subject. Decorative + on-brand.',
  ],
  infographic: [
    'Single-stat hero layout: one large number or percentage dominates the frame, supporting caption beneath, brand-color accent. Magazine-quality.',
    'Comparison split: two-panel before-after or A-vs-B layout with parallel data points. Clear visual hierarchy guiding eye top-to-bottom.',
    'Sequential flow diagram: 3-4 numbered steps or stages arranged horizontally or as a circular flow. Icons + short labels per step.',
  ],
  'data-driven': [
    'Bar-chart hero: prominent bar or column chart fills 60% of the frame, headline number large above, source/footnote small below. Magazine-style data viz.',
    'Trend-line editorial: line chart showing change over time as the focal element, with one inflection point highlighted in accent color.',
    'Pie / donut composition: circular data viz with the standout segment in brand color, other segments muted. Single key takeaway as headline.',
  ],
};

function pickAnglesForChip(chip: VisualStyleDirection | null): string[] {
  if (chip && ANGLE_SETS[chip]) return ANGLE_SETS[chip];
  // No chip — fall back to the lifestyle set since it covers the widest
  // generic photoreal scene language.
  return ANGLE_SETS.lifestyle;
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
  // CRITICAL chip-aware gate: quote-text + infographic + data-driven chips
  // REQUIRE text in the image (typography-led design, data labels, headline
  // numbers). Suppressing text for those chips defeats the entire purpose.
  // For all other chips the guard stays on — text overlays in lifestyle /
  // product-shot / illustration are usually hallucinations.
  const chipRequiresText = chip === 'quote-text' || chip === 'infographic' || chip === 'data-driven';
  const noTextShort = chipRequiresText
    ? ''
    : 'NO TEXT IN IMAGE. NO captions, signage, typography, words or letters anywhere.';
  const noTextLong = chipRequiresText
    ? ''
    : 'Pure visual storytelling without any embedded text — no captions, no signage, no typography overlays.';

  // F-visual-angles-chip-aware (2026-05-17): the previous 3 angles
  // (product-hero / human-interaction / atmosphere) only made sense for
  // lifestyle / BTS / UGC chips. For quote-text the angles were
  // misleading (a "product-hero stil-leven" is wrong when the brief is
  // a typography poster). Each chip now has its own 3 polarised
  // angle-options so variant A and B can diverge meaningfully within
  // the chip's own language.
  const angles = pickAnglesForChip(chip);

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
