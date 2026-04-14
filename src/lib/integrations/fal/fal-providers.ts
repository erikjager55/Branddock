// =============================================================
// fal.ai Provider Registry
//
// Shared metadata for all fal.ai image generation providers.
// Consumed by both the AI Trainer (model-type filtering) and
// the AI Studio (usage-category filtering).
// =============================================================

/**
 * Model type string literal. Uses a plain string union to stay decoupled
 * from Prisma and the feature-local type alias (both share the same values).
 */
type ModelTypeKey =
  | 'PERSON'
  | 'PRODUCT'
  | 'STYLE'
  | 'OBJECT'
  | 'BRAND_STYLE'
  | 'PHOTOGRAPHY'
  | 'ILLUSTRATION'
  | 'VOICE'
  | 'SOUND_EFFECT';

// ─── Types ───────────────────────────────────────────────────

export interface FalProvider {
  /**
   * Stable id used as the DB `provider` value and the URL slug. Does NOT
   * always equal the fal.ai endpoint — see `endpoint` below.
   */
  id: string;
  /**
   * Optional override for the fal.ai endpoint passed to `fal.subscribe()`.
   * Falls back to `id` when not set. Use this when fal.ai exposes a model
   * under a nested path (e.g. `fal-ai/recraft/v3/text-to-image`) but we
   * want to keep a short stable id in our DB.
   */
  endpoint?: string;
  label: string;
  description: string;
  cost: string;
  /** Preview image path (relative to /images/fal-providers/) */
  preview: string;
}

/** Usage categories for the AI Studio questionnaire filter */
export type FalUsageCategory =
  | 'portrait'
  | 'product'
  | 'scene'
  | 'illustration'
  | 'brand-design'
  | 'text-heavy';

// ─── Registry ────────────────────────────────────────────────

/** All available generation providers (superset) */
const ALL_FAL_PROVIDERS: Record<string, FalProvider> = {
  'fal-ai/flux-2-pro':      { id: 'fal-ai/flux-2-pro',      label: 'FLUX.2 Pro',      description: 'Best overall quality. Excels at sharp details, realistic textures, and consistent lighting across diverse scenes.',           cost: '$0.03/MP',  preview: 'flux-2-pro.svg' },
  'fal-ai/recraft-v3':      { id: 'fal-ai/recraft-v3',      endpoint: 'fal-ai/recraft/v3/text-to-image', label: 'Recraft V3', description: 'Purpose-built for brand design. Produces clean logos, icons, illustrations, and marketing assets with precise color control.', cost: '$0.04/img', preview: 'recraft-v3.svg' },
  'fal-ai/seedream-v4-5':   { id: 'fal-ai/seedream-v4-5',   endpoint: 'fal-ai/bytedance/seedream/v4/text-to-image', label: 'Seedream V4', description: 'Specialized in rendering readable text within images. Ideal for product labels, packaging, and signage.', cost: '$0.04/img', preview: 'seedream-v4-5.svg' },
  'fal-ai/flux-2':          { id: 'fal-ai/flux-2',          label: 'FLUX.2 Dev',      description: 'Fast and cost-effective. Strong prompt adherence with good quality — suitable for high-volume reference generation.',          cost: '$0.025/MP', preview: 'flux-2-dev.svg' },
  'fal-ai/ideogram-v3':     { id: 'fal-ai/ideogram-v3',     endpoint: 'fal-ai/ideogram/v3', label: 'Ideogram V3', description: 'Creative versatility with excellent typography. Handles mixed styles, complex compositions, and text-in-image well.', cost: '$0.04/img', preview: 'ideogram-v3.svg' },
  'fal-ai/nano-banana-pro': { id: 'fal-ai/nano-banana-pro', label: 'Nano Banana Pro', description: 'Optimized for portraits and people. Fast generation with strong face consistency, natural skin detail, and accurate lighting.', cost: '$0.02/img', preview: 'nanobanana-pro.svg' },
  'fal-ai/phota':           { id: 'fal-ai/phota',           label: 'Phota',           description: 'Photographic realism specialist. Produces natural skin tones, studio-quality lighting, and authentic photographic depth.',      cost: '$0.03/img', preview: 'phota.svg' },
};

// ─── Trainer filter (by model type) ──────────────────────────

/** Provider IDs per ConsistentModelType — AI Trainer only */
const FAL_PROVIDERS_BY_TYPE: Record<ModelTypeKey, string[]> = {
  PERSON:       ['fal-ai/flux-2-pro', 'fal-ai/nano-banana-pro', 'fal-ai/phota'],
  PRODUCT:      ['fal-ai/flux-2-pro', 'fal-ai/flux-2', 'fal-ai/seedream-v4-5'],
  OBJECT:       ['fal-ai/flux-2-pro', 'fal-ai/flux-2', 'fal-ai/seedream-v4-5'],
  STYLE:        ['fal-ai/flux-2-pro', 'fal-ai/recraft-v3', 'fal-ai/ideogram-v3', 'fal-ai/flux-2'],
  BRAND_STYLE:  ['fal-ai/recraft-v3', 'fal-ai/ideogram-v3', 'fal-ai/flux-2-pro', 'fal-ai/seedream-v4-5'],
  PHOTOGRAPHY:  ['fal-ai/flux-2-pro', 'fal-ai/phota', 'fal-ai/flux-2'],
  ILLUSTRATION: ['fal-ai/recraft-v3', 'fal-ai/ideogram-v3', 'fal-ai/flux-2-pro', 'fal-ai/flux-2'],
  VOICE:        [],
  SOUND_EFFECT: [],
};

// ─── Studio filter (by usage category) ───────────────────────

/** Provider IDs per usage category — AI Studio questionnaire */
const FAL_PROVIDERS_BY_USAGE: Record<FalUsageCategory, string[]> = {
  portrait:      ['fal-ai/flux-2-pro', 'fal-ai/nano-banana-pro', 'fal-ai/phota'],
  product:       ['fal-ai/flux-2-pro', 'fal-ai/flux-2', 'fal-ai/seedream-v4-5'],
  scene:         ['fal-ai/flux-2-pro', 'fal-ai/flux-2', 'fal-ai/phota'],
  illustration:  ['fal-ai/recraft-v3', 'fal-ai/ideogram-v3', 'fal-ai/flux-2-pro'],
  'brand-design': ['fal-ai/recraft-v3', 'fal-ai/ideogram-v3', 'fal-ai/flux-2-pro', 'fal-ai/seedream-v4-5'],
  'text-heavy':  ['fal-ai/seedream-v4-5', 'fal-ai/ideogram-v3', 'fal-ai/recraft-v3'],
};

// ─── Public API ──────────────────────────────────────────────

/** Flat list of all providers (for API validation, detail panels, full grid) */
export const FAL_PROVIDERS: FalProvider[] = Object.values(ALL_FAL_PROVIDERS);

/** Lookup a single provider by id — returns null if unknown. */
export function getFalProviderById(id: string): FalProvider | null {
  return ALL_FAL_PROVIDERS[id] ?? null;
}

/**
 * Resolve the fal.ai endpoint string to pass to `fal.subscribe()` for a given
 * provider id. Falls back to the id itself when no `endpoint` override is set.
 */
export function getFalEndpoint(provider: FalProvider): string {
  return provider.endpoint ?? provider.id;
}

/** Get the relevant providers for an AI Trainer model type (ordered by relevance) */
export function getFalProvidersForType(type: string): FalProvider[] {
  const ids = FAL_PROVIDERS_BY_TYPE[type as ModelTypeKey] ?? Object.keys(ALL_FAL_PROVIDERS);
  return ids.map((id) => ALL_FAL_PROVIDERS[id]).filter((p): p is FalProvider => Boolean(p));
}

/** Get the relevant providers for an AI Studio usage category. Null = return all. */
export function getFalProvidersByUsage(
  usage: FalUsageCategory | null,
): FalProvider[] {
  if (usage === null) return FAL_PROVIDERS;
  const ids = FAL_PROVIDERS_BY_USAGE[usage] ?? Object.keys(ALL_FAL_PROVIDERS);
  return ids.map((id) => ALL_FAL_PROVIDERS[id]).filter((p): p is FalProvider => Boolean(p));
}

/** Usage category labels for the questionnaire UI */
export const FAL_USAGE_LABELS: Record<FalUsageCategory, { label: string; description: string }> = {
  portrait:      { label: 'Portrait / People',  description: 'Faces, headshots, lifestyle people shots' },
  product:       { label: 'Product Shot',       description: 'Studio product photography, packaging' },
  scene:         { label: 'Scene / Environment', description: 'Landscapes, interiors, lifestyle scenes' },
  illustration:  { label: 'Illustration',       description: 'Hand-drawn, vector, stylized artwork' },
  'brand-design': { label: 'Brand Design',      description: 'Logos, icons, marketing assets' },
  'text-heavy':  { label: 'Text-Heavy',         description: 'Labels, signage, posters with readable text' },
};
