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

const SOURCE_LABELS: Record<VisualBriefSource, string> = {
  generate: 'AI genereren',
  library: 'Bestaande asset uit Media Library',
  upload: 'Eigen foto uploaden',
  url: 'Foto importeren via URL',
  stock: 'Stockfoto via Pexels',
  compose: 'Compose — meerdere referentie-assets combineren',
  'trained-style': 'Workspace trained-style model',
  'photography-request': 'Echte foto laten maken (fotograaf-briefing)',
  none: 'Geen visual',
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
        'Workspace heeft een trained model — dat levert de hoogste brand-consistency over campagnes. Stijl is écht herkenbaar als jouw merk in plaats van generieke AI.',
      modelId: 'trained-lora',
      modelLabel: m.label,
      modelReasoning: 'Trained model = workspace-specifiek; sterker dan elk generiek model voor brand-look.',
      costPerImageUsd: m.costPerImageUsd,
      strengths: m.strengths,
    };
  }

  const chip = input.styleDirection;
  const contentTypeId = input.contentTypeId ?? '';

  // ── 2. Style chip drives model-choice when distinctive ──────
  const GENERATE_SOURCE_REASONING_DEFAULT =
    'AI generation past goed bij standaard content-items: sneller dan stockfoto-zoeken, meer brand-controle dan losse uploads, lagere drempel dan fotograaf. Voor authenticity-critical content (case-studies, klant-verhalen) geldt photography als alternatief — zie opt-in onderaan.';

  if (chip === 'illustration') {
    const m = MODEL_META['nano-banana-pro'];
    return {
      source: 'generate',
      sourceLabel: SOURCE_LABELS.generate,
      sourceReasoning:
        'Illustration past bij generate-flow: brand-style anchors of trained model is overkill voor visualisatie-content. AI levert sneller en consistent.',
      modelId: 'nano-banana-pro',
      modelLabel: m.label,
      modelReasoning:
        'Nano Banana Pro levert illustration-stijl met sterke brand-fit en geen tekst-overlay. Head-to-head 2026 toonde composite 88 vs Recraft V3 60 (Recraft produceerde embedded captions).',
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
        'Quote-text + typography: AI generation is de enige praktische source. Library/upload mist creative-control op layout en typography-rendering.',
      modelId: 'ideogram-v3',
      modelLabel: m.label,
      modelReasoning:
        'Ideogram V3 is typography-specialist met crisp text-rendering, clean modern fonts en correct spacing. Head-to-head 2026: Ideogram +9pt vs Nano Banana op quote-poster briefs.',
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
        'Infographic / data-viz vereist generate met text-rendering capable model — stock en library hebben zelden de specifieke data-presentatie die je nodig hebt.',
      modelId: 'nano-banana-2',
      modelLabel: m.label,
      modelReasoning:
        'Nano Banana 2 levert sterke data-viz output met world-knowledge accuracy. Marginale +1pt verschil met Ideogram V3 — Nano Banana wint op brandFit en is $0.02 goedkoper.',
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
        'Product-shot: AI generation als product nog niet bestaat of voor concept-renders. Voor échte producten in retail: photography of upload van studio-shoot is sterker.',
      modelId: 'seedream-v4',
      modelLabel: m.label,
      modelReasoning:
        'Seedream V4 is product-photography specialist met material-accurate textures en text-on-product label legibility. Head-to-head 2026 wint voor close-up product-shots met labels.',
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
        `${contentTypeId.replace(/-/g, ' ')} bevat doorgaans tekst-overlay (CTA, kop). AI generation met text-rendering specialist is hier de juiste source — stockfoto's missen je copy en upload van losse foto's vereist post-edit voor tekst.`,
      modelId: 'nano-banana-2',
      modelLabel: m.label,
      modelReasoning:
        'Nano Banana 2 produceert leesbare tekst waar FLUX 2 of Imagen 4 falen op tekst-overlay use-case.',
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
        'Lifestyle / behind-the-scenes content: AI generation is snel + brand-controleerbaar. Voor klant-testimonials of authenticity-kritische content is photography sterker — zie opt-in onderaan.',
      modelId: 'phota',
      modelLabel: m.label,
      modelReasoning:
        'Phota is photoreal specialist voor authentic candid scenes met mensen. Head-to-head 2026: Phota +10pt vs FLUX 2 Pro op warm/professional briefs — sterker op authenticity en brand-fit.',
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
      sourceReasoning:
        GENERATE_SOURCE_REASONING_DEFAULT,
      modelId: 'flux-2-pro',
      modelLabel: m.label,
      modelReasoning:
        'FLUX 2 Pro is safe photoreal default voor generic scenes zonder specifieke chip — geschikt voor lifestyle, scene-content en editorial-look.',
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
    modelReasoning: 'Default keuze voor algemene image-generation.',
    costPerImageUsd: m.costPerImageUsd,
    strengths: m.strengths,
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
