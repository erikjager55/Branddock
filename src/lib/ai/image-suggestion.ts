// =============================================================
// Image-flow suggestion engine (F37, audit 2026-05-13)
// =============================================================
// Op basis van content-type + style-chip + workspace-LoRA-availability
// adviseert het systeem welk source + model het beste past. Banner in
// Step 1 toont aanbeveling + reasoning; user kan altijd overrulen.
//
// Decision-tree:
//   1. Workspace heeft LoRA?           → suggest TRAINED_STYLE
//   2. Style chip = illustration?       → suggest GENERATE met Recraft V4
//   3. Style chip = quote-text?         → suggest GENERATE met Nano Banana (text rendering)
//   4. Content-type is text-heavy ad?   → suggest GENERATE met Nano Banana
//   5. Style chip = product-shot + luxury? → suggest GENERATE met Imagen 4
//   6. Style chip = infographic?        → suggest GENERATE met Nano Banana (world-knowledge)
//   7. Default (lifestyle/scene/etc)    → suggest GENERATE met FLUX 2 Pro
//
// Photography is NIET default — alleen subtiele opt-in onderaan voor
// authenticity-critical use-cases (case-studies, testimonials).
// =============================================================

import type { VisualBriefSource, VisualStyleDirection } from './canvas-context';

export type SuggestedModelId =
  | 'flux-2-pro'
  | 'nano-banana-2'
  | 'nano-banana-pro'
  | 'recraft-v4'
  | 'imagen-4'
  | 'phota'
  | 'ideogram-v3'
  | 'seedream-v4'
  | 'trained-lora';

export interface ImageSuggestion {
  source: VisualBriefSource;
  /** Mensentaal label voor source (NL). */
  sourceLabel: string;
  /** Waarom deze source past bij dit content-type. */
  sourceReasoning: string;
  modelId: SuggestedModelId;
  modelLabel: string;
  /** Waarom dit model wint binnen de gekozen source. Alleen relevant voor source=generate / trained-style. */
  modelReasoning: string;
  costPerImageUsd: number;
  /** Extra strengths to surface in the banner ("text rendering excellent", etc) */
  strengths: string[];
}

export const SOURCE_LABELS: Record<VisualBriefSource, string> = {
  generate: 'AI Generate',
  library: 'From Library',
  upload: 'Upload',
  url: 'Import URL',
  stock: 'Stock photos',
  compose: 'Compose — combine reference assets',
  'trained-style': 'Trained-style model',
  'photography-request': 'Real photography (photographer brief)',
  none: 'No visual',
};

interface SuggestInput {
  contentTypeId: string | null;
  styleDirection: VisualStyleDirection | null;
  /** Has the workspace a trained LoRA model available? */
  hasTrainedLora: boolean;
}

const MODEL_META: Record<SuggestedModelId, { label: string; costPerImageUsd: number; strengths: string[] }> = {
  'flux-2-pro': {
    label: 'FLUX 2 Pro',
    costPerImageUsd: 0.03,
    strengths: ['Aesthetic photorealism', 'Cinematic lighting', 'Editorial-look'],
  },
  'nano-banana-2': {
    label: 'Nano Banana 2 (Gemini 2.5 Flash Image)',
    costPerImageUsd: 0.04,
    strengths: ['Text rendering', 'Multi-character consistency', 'World-knowledge accuracy'],
  },
  'nano-banana-pro': {
    label: 'Nano Banana Pro (Gemini 3 Pro Image)',
    costPerImageUsd: 0.13,
    strengths: ['Production-ready posters', 'Multi-reference fusion (14 imgs)', 'Targeted edits'],
  },
  'recraft-v4': {
    label: 'Recraft V4',
    costPerImageUsd: 0.04,
    strengths: ['Brand illustration', 'Style-reference (1-5 refs)', 'Vector / design-forward'],
  },
  'imagen-4': {
    label: 'Imagen 4',
    costPerImageUsd: 0.04,
    strengths: ['Luxury product detail', 'Tekst-in-image', 'Material accuracy'],
  },
  'trained-lora': {
    label: 'Workspace Trained Model',
    costPerImageUsd: 0.05,
    strengths: ['Custom brand-look', 'Highest consistency', 'Brand-specific characters'],
  },
  // F42-final-2 (audit 2026-05-15): added per all-chips experiment winners
  phota: {
    label: 'Phota',
    costPerImageUsd: 0.03,
    strengths: ['Photoreal with people', 'Authentic candid scenes', 'Warm professional mood'],
  },
  'ideogram-v3': {
    label: 'Ideogram V3',
    costPerImageUsd: 0.04,
    strengths: ['Typography specialist', 'Crisp text rendering', 'Poster / quote design'],
  },
  'seedream-v4': {
    label: 'Seedream V4',
    costPerImageUsd: 0.04,
    strengths: ['Product detail accuracy', 'Label legibility', 'Material textures'],
  },
};

// Content-types where text-in-image dominates (ads with copy, posters)
const TEXT_HEAVY_CONTENT_TYPES = new Set([
  'search-ad',
  'social-ad',
  'display-ad',
  'retargeting-ad',
  'video-ad',
  'native-ad',
  'instagram-post', // carousel covers often have text
  'linkedin-ad',
  'linkedin-carousel',
  'social-carousel',
]);

// Content-types waar tekstvrije photorealistic scenes domineren
const PHOTOREAL_SCENE_CONTENT_TYPES = new Set([
  'blog-post',
  'pillar-page',
  'article',
  'thought-leadership',
  'newsletter',
  'case-study',
  'landing-page',
  'linkedin-post',
  'linkedin-article',
  'facebook-post',
]);

/**
 * Suggest the best image source + model for this content brief.
 * Returns null when source = 'none' is already chosen (no suggestion needed).
 */
export function suggestImageApproach(input: SuggestInput): ImageSuggestion {
  // ── 1. LoRA always wins when available ──────────────────────
  if (input.hasTrainedLora) {
    const m = MODEL_META['trained-lora'];
    return {
      source: 'trained-style',
      sourceLabel: SOURCE_LABELS['trained-style'],
      sourceReasoning:
        'Your workspace has a trained model — it delivers the highest brand consistency across campaigns. The style is genuinely recognizable as your brand rather than generic AI output.',
      modelId: 'trained-lora',
      modelLabel: m.label,
      modelReasoning:
        'Trained model is workspace-specific; stronger than any generic model for brand look.',
      costPerImageUsd: m.costPerImageUsd,
      strengths: m.strengths,
    };
  }

  const chip = input.styleDirection;
  const contentTypeId = input.contentTypeId ?? '';

  // ── 2. Style chip drives model-choice when distinctive ──────
  const GENERATE_SOURCE_REASONING_DEFAULT =
    'AI generation fits standard content items: faster than stock photo search, more brand control than ad-hoc uploads, lower threshold than commissioning a photographer. For authenticity-critical content (case studies, customer stories) consider photography — see opt-in below.';

  if (chip === 'illustration') {
    const m = MODEL_META['nano-banana-pro'];
    return {
      source: 'generate',
      sourceLabel: SOURCE_LABELS.generate,
      sourceReasoning:
        'Illustration fits the generate flow: brand-style anchors or trained models are overkill for visualization content. AI delivers fast and consistent output.',
      modelId: 'nano-banana-pro',
      modelLabel: m.label,
      modelReasoning:
        'Nano Banana Pro delivers illustration style with strong brand fit and no text overlay. Head-to-head 2026: composite 88 vs Recraft V3 60 (Recraft produced embedded captions).',
      costPerImageUsd: m.costPerImageUsd,
      strengths: m.strengths,
    };
  }

  if (chip === 'quote-text') {
    const m = MODEL_META['ideogram-v3'];
    return {
      source: 'generate',
      sourceLabel: SOURCE_LABELS.generate,
      sourceReasoning:
        'Quote-text + typography: AI generation is the only practical source. Library/upload lacks creative control over layout and typography rendering.',
      modelId: 'ideogram-v3',
      modelLabel: m.label,
      modelReasoning:
        'Ideogram V3 is a typography specialist with crisp text rendering, clean modern fonts, and correct spacing. Head-to-head 2026: Ideogram +9pt vs Nano Banana on quote-poster briefs.',
      costPerImageUsd: m.costPerImageUsd,
      strengths: m.strengths,
    };
  }

  if (chip === 'infographic' || chip === 'data-driven') {
    const m = MODEL_META['nano-banana-2'];
    return {
      source: 'generate',
      sourceLabel: SOURCE_LABELS.generate,
      sourceReasoning:
        'Infographic / data-viz requires a generate path with a text-rendering capable model — stock and library rarely have the specific data presentation you need.',
      modelId: 'nano-banana-2',
      modelLabel: m.label,
      modelReasoning:
        'Nano Banana 2 delivers strong data-viz output with world-knowledge accuracy. Marginal +1pt difference with Ideogram V3 — Nano Banana wins on brand fit and is $0.02 cheaper.',
      costPerImageUsd: m.costPerImageUsd,
      strengths: m.strengths,
    };
  }

  if (chip === 'product-shot') {
    const m = MODEL_META['seedream-v4'];
    return {
      source: 'generate',
      sourceLabel: SOURCE_LABELS.generate,
      sourceReasoning:
        'Product-shot: AI generation when the product does not yet exist or for concept renders. For real retail products, photography or upload of a studio shoot is stronger.',
      modelId: 'seedream-v4',
      modelLabel: m.label,
      modelReasoning:
        'Seedream V4 is a product photography specialist with material-accurate textures and text-on-product label legibility. Head-to-head 2026: wins for close-up product shots with labels.',
      costPerImageUsd: m.costPerImageUsd,
      strengths: m.strengths,
    };
  }

  // ── 3. Content-type override (ads / carousels) ──────────────
  if (TEXT_HEAVY_CONTENT_TYPES.has(contentTypeId)) {
    const m = MODEL_META['nano-banana-2'];
    return {
      source: 'generate',
      sourceLabel: SOURCE_LABELS.generate,
      sourceReasoning:
        `${contentTypeId.replace(/-/g, ' ')} typically contains text overlay (CTA, headline). AI generation with a text-rendering specialist is the right source here — stock photos miss your copy and uploads require post-edit for text.`,
      modelId: 'nano-banana-2',
      modelLabel: m.label,
      modelReasoning:
        'Nano Banana 2 produces legible text where FLUX 2 or Imagen 4 fail on the text-overlay use case.',
      costPerImageUsd: m.costPerImageUsd,
      strengths: m.strengths,
    };
  }

  // ── 4. Photoreal scene with people (lifestyle/behind-the-scenes/ugc) ──
  if (chip === 'lifestyle' || chip === 'behind-the-scenes' || chip === 'ugc') {
    const m = MODEL_META.phota;
    return {
      source: 'generate',
      sourceLabel: SOURCE_LABELS.generate,
      sourceReasoning:
        'Lifestyle / behind-the-scenes content: AI generation is fast and brand-controllable. For customer testimonials or authenticity-critical content, photography is stronger — see opt-in below.',
      modelId: 'phota',
      modelLabel: m.label,
      modelReasoning:
        'Phota is a photoreal specialist for authentic candid scenes with people. Head-to-head 2026: Phota +10pt vs FLUX 2 Pro on warm/professional briefs — stronger on authenticity and brand fit.',
      costPerImageUsd: m.costPerImageUsd,
      strengths: m.strengths,
    };
  }

  // ── 5. Generic photoreal default (text-content types zonder specifieke chip) ──
  if (PHOTOREAL_SCENE_CONTENT_TYPES.has(contentTypeId) || !chip) {
    const m = MODEL_META['flux-2-pro'];
    return {
      source: 'generate',
      sourceLabel: SOURCE_LABELS.generate,
      sourceReasoning: GENERATE_SOURCE_REASONING_DEFAULT,
      modelId: 'flux-2-pro',
      modelLabel: m.label,
      modelReasoning:
        'FLUX 2 Pro is a safe photoreal default for generic scenes without a specific chip — suitable for lifestyle, scene content, and editorial-look images.',
      costPerImageUsd: m.costPerImageUsd,
      strengths: m.strengths,
    };
  }

  // Final fallback — shouldn't usually hit
  const m = MODEL_META['flux-2-pro'];
  return {
    source: 'generate',
    sourceLabel: SOURCE_LABELS.generate,
    sourceReasoning: GENERATE_SOURCE_REASONING_DEFAULT,
    modelId: 'flux-2-pro',
    modelLabel: m.label,
    modelReasoning: 'Default choice for generic image generation.',
    costPerImageUsd: m.costPerImageUsd,
    strengths: m.strengths,
  };
}

/**
 * Photography opt-in copy — shown subtly at the bottom, NOT as a default
 * suggestion. For authenticity-critical use cases.
 */
export const PHOTOGRAPHY_OPT_IN_COPY = {
  label: 'Prefer real photography?',
  description:
    'For case studies, testimonials, or location-specific content, real photography can convert better than AI. Branddock generates a photographer brief and you upload the photo when ready.',
};

export { MODEL_META };
