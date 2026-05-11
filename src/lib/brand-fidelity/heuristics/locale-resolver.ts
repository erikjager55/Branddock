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
export const DEFAULT_LOCALE_BY_LANG: Record<string, Locale> = {
  en: 'en-GB',
  nl: 'nl-NL',
  de: 'de-DE',
  // fr / es / pt / it: vallen op 'en-GB' fallback (geen heuristic-pakket v1)
};

/** Ultimate fallback wanneer geen voiceguide + onbekende workspace.contentLanguage. */
export const ULTIMATE_FALLBACK: Locale = 'en-GB';

/** Welke laag van de 3-laagse fallback de actieve locale heeft geleverd. */
export type LocaleSource = 'voiceguide' | 'workspace-default' | 'fallback';

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
  // Hot path (F-VAL content-generation): sequentieel met short-circuit op
  // voiceguide-hit zodat 90% van de calls slechts één DB-roundtrip kost.
  const voiceguide = await prisma.brandVoiceguide.findUnique({
    where: { workspaceId },
    select: { contentLocale: true },
  });
  if (voiceguide?.contentLocale && isSupportedLocale(voiceguide.contentLocale)) {
    return voiceguide.contentLocale;
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { contentLanguage: true },
  });
  const lang = workspace?.contentLanguage;
  if (lang && DEFAULT_LOCALE_BY_LANG[lang]) {
    return DEFAULT_LOCALE_BY_LANG[lang];
  }

  return ULTIMATE_FALLBACK;
}

/**
 * Variant van `resolveLocaleForBrand` die ook teruggeeft uit welke laag de
 * locale komt — voor UI-indicators die moeten tonen waarom een bepaalde
 * locale actief is (voiceguide override / workspace default / fallback).
 *
 * Parallelle queries omdat de UI altijd de source-label wil tonen — geen
 * short-circuit-baat zoals in de hot-path-variant.
 */
export async function resolveLocaleForBrandWithSource(
  workspaceId: string,
): Promise<{ locale: Locale; source: LocaleSource }> {
  const [voiceguide, workspace] = await Promise.all([
    prisma.brandVoiceguide.findUnique({
      where: { workspaceId },
      select: { contentLocale: true },
    }),
    prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { contentLanguage: true },
    }),
  ]);

  if (voiceguide?.contentLocale && isSupportedLocale(voiceguide.contentLocale)) {
    return { locale: voiceguide.contentLocale, source: 'voiceguide' };
  }
  const lang = workspace?.contentLanguage;
  if (lang && DEFAULT_LOCALE_BY_LANG[lang]) {
    return { locale: DEFAULT_LOCALE_BY_LANG[lang], source: 'workspace-default' };
  }
  return { locale: ULTIMATE_FALLBACK, source: 'fallback' };
}
