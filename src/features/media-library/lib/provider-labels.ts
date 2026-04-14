import { getFalProviderById } from '@/lib/integrations/fal/fal-providers';

/**
 * Legacy provider aliases — maps old enum values that may still exist in the
 * DB (from records created before the migration to fal.ai ids) to their
 * current fal.ai equivalents.
 */
const LEGACY_ALIASES: Record<string, string> = {
  FLUX_PRO: 'fal-ai/flux-2-pro',
  RECRAFT: 'fal-ai/recraft-v3',
  IDEOGRAM: 'fal-ai/ideogram-v3',
};

/** Built-in non-fal providers. */
const BUILTIN_LABELS: Record<string, { short: string; full: string }> = {
  IMAGEN: { short: 'Imagen', full: 'Google Imagen 4' },
  DALLE: { short: 'DALL-E 3', full: 'OpenAI DALL-E 3' },
  TRAINED_MODEL: { short: 'Trained Model', full: 'Trained Model (fal.ai LoRA)' },
};

/**
 * Short label (badge on cards). Falls back to the provider id if unknown.
 */
export function getProviderShortLabel(provider: string): string {
  const builtin = BUILTIN_LABELS[provider];
  if (builtin) return builtin.short;

  // Legacy aliases fall through to fal provider lookup
  const resolved = LEGACY_ALIASES[provider] ?? provider;
  const fal = getFalProviderById(resolved);
  return fal?.label ?? provider;
}

/**
 * Full label (detail panel). Falls back to the provider id if unknown.
 */
export function getProviderFullLabel(provider: string): string {
  const builtin = BUILTIN_LABELS[provider];
  if (builtin) return builtin.full;

  const resolved = LEGACY_ALIASES[provider] ?? provider;
  const fal = getFalProviderById(resolved);
  return fal ? `${fal.label} (fal.ai)` : provider;
}
