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
  | 'trained-lora';

export interface ImageSuggestion {
  source: VisualBriefSource;
  modelId: SuggestedModelId;
  modelLabel: string;
  reasoning: string;
  costPerImageUsd: number;
  /** Extra strengths to surface in the banner ("text rendering excellent", etc) */
  strengths: string[];
}

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
      modelId: 'trained-lora',
      modelLabel: m.label,
      costPerImageUsd: m.costPerImageUsd,
      strengths: m.strengths,
      reasoning:
        'Je workspace heeft een trained model. Dit levert de hoogste brand-consistency over campagnes — de stijl is écht herkenbaar als jouw merk i.p.v. generieke AI-output.',
    };
  }

  const chip = input.styleDirection;
  const contentTypeId = input.contentTypeId ?? '';

  // ── 2. Style chip drives model-choice when distinctive ──────
  if (chip === 'illustration') {
    // F42-final (audit 2026-05-14): switch illustration → Nano Banana Pro.
    // Head-to-head experiment toonde Nano Banana 88 vs Recraft 60 op
    // identieke illustration-brief. Recraft heeft style-match (88) maar
    // produceert overal embedded tekst (noText score 5) plus zwakkere
    // brandFit. Nano Banana levert tekstvrije illustration + warm/
    // professional sfeer + 50% goedkoper.
    const m = MODEL_META['nano-banana-pro'];
    return {
      source: 'generate',
      modelId: 'nano-banana-pro',
      modelLabel: m.label,
      costPerImageUsd: m.costPerImageUsd,
      strengths: m.strengths,
      reasoning:
        'Nano Banana Pro levert illustration-stijl met sterke brand-fit en geen tekst-overlay. Per onze head-to-head (mei 2026) scoort het composite 88 vs Recraft V3 60 op identieke brief — Recraft produceerde embedded captions die de output onbruikbaar maakten.',
    };
  }

  if (chip === 'quote-text' || chip === 'infographic' || chip === 'data-driven') {
    const m = MODEL_META['nano-banana-2'];
    return {
      source: 'generate',
      modelId: 'nano-banana-2',
      modelLabel: m.label,
      costPerImageUsd: m.costPerImageUsd,
      strengths: m.strengths,
      reasoning:
        'Nano Banana 2 is in de markt de beste op tekst-in-image rendering en accurate data-viz. FLUX 2 produceert garbled text bij infographics; Nano Banana levert leesbare resultaten.',
    };
  }

  if (chip === 'product-shot') {
    const m = MODEL_META['imagen-4'];
    return {
      source: 'generate',
      modelId: 'imagen-4',
      modelLabel: m.label,
      costPerImageUsd: m.costPerImageUsd,
      strengths: m.strengths,
      reasoning:
        'Imagen 4 wint product-photography met material-accurate output (leer, glas, metaal). Voor close-up product-shots is dit de juiste keuze boven photorealistic scene-modellen.',
    };
  }

  // ── 3. Content-type override (ads / carousels) ──────────────
  if (TEXT_HEAVY_CONTENT_TYPES.has(contentTypeId)) {
    const m = MODEL_META['nano-banana-2'];
    return {
      source: 'generate',
      modelId: 'nano-banana-2',
      modelLabel: m.label,
      costPerImageUsd: m.costPerImageUsd,
      strengths: m.strengths,
      reasoning:
        `${contentTypeId.replace(/-/g, ' ')} bevat vaak tekst-overlay. Nano Banana 2 produceert leesbare tekst waar FLUX 2 of Imagen 4 falen op deze use-case.`,
    };
  }

  // ── 4. Default — photorealistic scene ───────────────────────
  if (PHOTOREAL_SCENE_CONTENT_TYPES.has(contentTypeId) || !chip || chip === 'lifestyle' || chip === 'behind-the-scenes' || chip === 'ugc') {
    const m = MODEL_META['flux-2-pro'];
    return {
      source: 'generate',
      modelId: 'flux-2-pro',
      modelLabel: m.label,
      costPerImageUsd: m.costPerImageUsd,
      strengths: m.strengths,
      reasoning:
        'FLUX 2 Pro levert de beste aesthetic photorealism met cinematic lighting. Geschikt voor lifestyle, scene-content, en editorial-look images. Snel + cost-efficient.',
    };
  }

  // Final fallback — shouldn't usually hit
  const m = MODEL_META['flux-2-pro'];
  return {
    source: 'generate',
    modelId: 'flux-2-pro',
    modelLabel: m.label,
    costPerImageUsd: m.costPerImageUsd,
    strengths: m.strengths,
    reasoning: 'Default keuze voor algemene image-generation.',
  };
}

/**
 * Photography opt-in copy — getoond subtiel onderaan, NIET als
 * default-suggestion. Voor authenticity-critical use-cases.
 */
export const PHOTOGRAPHY_OPT_IN_COPY = {
  label: 'Liever zelf een foto maken?',
  description:
    'Voor case-studies, testimonials, of locatie-specifieke content kan echte fotografie hoger converteren dan AI. Branddock genereert een fotograaf-briefing en je upload de foto wanneer klaar.',
};

export { MODEL_META };
