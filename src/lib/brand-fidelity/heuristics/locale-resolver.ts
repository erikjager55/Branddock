// ============================================================
// Locale resolver — per-brand locale-routing voor F-VAL Pijler 3
// heuristiek-pakketten (Δ-2 dependency).
//
// Implementeert ADR-3 (`docs/adr/2026-05-08-locale-routing-brand-voice.md`):
//
//   1. BrandVoiceguide.contentLocale (per-brand source-of-truth)
//   2. Fallback: Workspace.contentLanguage mapped naar default-locale
//      (en→en-GB, nl→nl-NL, de→de-DE)
//   3. Ultimate default: 'en-GB'
//
// Hard-switch principe: `nl-BE` is NIET een merge van nl-NL + BE-overrides;
// de heuristics-package-loader produceert bevroren `nl-BE` units. Locale
// resolver levert alleen de tag; package-resolution gebeurt in
// `getHeuristicsForLocale(locale)` (separate task — heuristics-packages-multilingual).
// ============================================================

import { prisma } from '@/lib/prisma';

/** Supported locales in v1 — IETF BCP 47 tags. */
export const SUPPORTED_LOCALES = ['nl-NL', 'nl-BE', 'en-GB', 'de-DE'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** Default-locale per ISO-639-1 language-code (Workspace.contentLanguage values). */
const DEFAULT_LOCALE_BY_LANG: Record<string, Locale> = {
  en: 'en-GB',
  nl: 'nl-NL',
  de: 'de-DE',
  // fr / es / pt / it: vallen op 'en-GB' fallback (geen heuristic-pakket v1)
};

/** Ultimate fallback wanneer geen voiceguide + onbekende workspace.contentLanguage. */
const ULTIMATE_FALLBACK: Locale = 'en-GB';

/**
 * Validate dat een string een ondersteunde Locale is. Gebruik in API-Zod-schema's
 * + bij read uit DB om type-narrowing safe te maken.
 */
export function isSupportedLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Resolve de actieve locale voor een workspace's brand. Drie-laags fallback
 * conform ADR-3:
 *   1. BrandVoiceguide.contentLocale (when set + supported)
 *   2. Workspace.contentLanguage → DEFAULT_LOCALE_BY_LANG[lang]
 *   3. ULTIMATE_FALLBACK ('en-GB')
 *
 * Cost: 1-2 Prisma queries (cacheable binnen `getBrandContext` 5-min cache —
 * separate caching-laag verantwoordelijk; resolver zelf is lookup-only).
 */
export async function resolveLocaleForBrand(workspaceId: string): Promise<Locale> {
  // Step 1: voiceguide.contentLocale (preferred)
  const voiceguide = await prisma.brandVoiceguide.findUnique({
    where: { workspaceId },
    select: { contentLocale: true },
  });
  if (voiceguide?.contentLocale && isSupportedLocale(voiceguide.contentLocale)) {
    return voiceguide.contentLocale;
  }

  // Step 2: workspace.contentLanguage mapped to default-locale
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { contentLanguage: true },
  });
  const lang = workspace?.contentLanguage;
  if (lang && DEFAULT_LOCALE_BY_LANG[lang]) {
    return DEFAULT_LOCALE_BY_LANG[lang];
  }

  // Step 3: ultimate fallback
  return ULTIMATE_FALLBACK;
}
