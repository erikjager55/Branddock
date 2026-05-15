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

  if (chip === 'quote-text') {
    // F42-final-2 (audit 2026-05-15): all-chips experiment toonde
    // Ideogram V3 composite 78 vs Nano Banana 69 op typography-poster.
    const m = MODEL_META['ideogram-v3'];
    return {
      source: 'generate',
      modelId: 'ideogram-v3',
      modelLabel: m.label,
      costPerImageUsd: m.costPerImageUsd,
      strengths: m.strengths,
      reasoning:
        'Ideogram V3 is typography-specialist met crisp text-rendering, clean modern fonts en correct spacing. Per onze head-to-head (mei 2026) wint Ideogram +9pt vs Nano Banana op quote-poster briefs.',
    };
  }

  if (chip === 'infographic' || chip === 'data-driven') {
    const m = MODEL_META['nano-banana-2'];
    return {
      source: 'generate',
      modelId: 'nano-banana-2',
      modelLabel: m.label,
      costPerImageUsd: m.costPerImageUsd,
      strengths: m.strengths,
      reasoning:
        'Nano Banana 2 levert sterke data-viz output met world-knowledge accuracy. Marginale +1pt verschil met Ideogram V3 — Nano Banana wint op brandFit en is $0.02 goedkoper.',
    };
  }

  if (chip === 'product-shot') {
    // F42-final-2: all-chips experiment bevestigde Seedream V4 wint
    // product-shot composite 88 (materialAccuracy 82, labelLegibility 92).
    const m = MODEL_META['seedream-v4'];
    return {
      source: 'generate',
      modelId: 'seedream-v4',
      modelLabel: m.label,
      costPerImageUsd: m.costPerImageUsd,
      strengths: m.strengths,
      reasoning:
        'Seedream V4 is product-photography specialist met material-accurate textures en text-on-product label legibility. Per onze head-to-head (mei 2026) wint Seedream voor close-up product-shots met labels.',
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

  // ── 4. Photoreal scene with people (lifestyle/behind-the-scenes/ugc) ──
  if (chip === 'lifestyle' || chip === 'behind-the-scenes' || chip === 'ugc') {
    // F42-final-2: all-chips experiment toonde Phota composite 87 vs
    // FLUX 2 Pro 77 op photoreal-with-people. Phota is photoreal
    // specialist met sterkere authenticity en brand-fit (88).
    const m = MODEL_META.phota;
    return {
      source: 'generate',
      modelId: 'phota',
      modelLabel: m.label,
      costPerImageUsd: m.costPerImageUsd,
      strengths: m.strengths,
      reasoning:
        'Phota is photoreal specialist voor authentic candid scenes met mensen. Per onze head-to-head (mei 2026) wint Phota +10pt vs FLUX 2 Pro op warm/professional briefs — sterker op authenticity en brand-fit.',
    };
  }

  // ── 5. Generic photoreal default (text-content types zonder specifieke chip) ──
  if (PHOTOREAL_SCENE_CONTENT_TYPES.has(contentTypeId) || !chip) {
    const m = MODEL_META['flux-2-pro'];
    return {
      source: 'generate',
      modelId: 'flux-2-pro',
      modelLabel: m.label,
      costPerImageUsd: m.costPerImageUsd,
      strengths: m.strengths,
      reasoning:
        'FLUX 2 Pro is safe photoreal default voor generic scenes zonder specifieke chip. Geschikt voor lifestyle, scene-content en editorial-look images.',
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
