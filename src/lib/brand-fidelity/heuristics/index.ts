// ============================================================
// Heuristic-package registry — Δ-2 sub-cluster B
//
// Per ADR-3 hard-switch principle: per locale één bevroren HeuristicPackage.
// nl-BE wordt later programmatisch uit nl-NL gebouwd (whitelist + extra
// flags) en als bevroren unit geregistreerd — niet on-demand bij read.
//
// v1 ondersteunde locales: nl-NL (deze commit), en-GB / nl-BE / de-DE volgen
// in vervolg-commits.
// ============================================================

import type { HeuristicPackage } from './types';
import type { Locale } from './locale-resolver';
import { resolveLocaleForBrand } from './locale-resolver';
import { NL_NL_PACKAGE } from './nl-NL';
import { EN_GB_PACKAGE } from './en-GB';
import { NL_BE_PACKAGE } from './nl-BE';
import { DE_DE_PACKAGE } from './de-DE';

const REGISTRY: Partial<Record<Locale, HeuristicPackage>> = {
  'nl-NL': NL_NL_PACKAGE,
  'en-GB': EN_GB_PACKAGE,
  'nl-BE': NL_BE_PACKAGE,
  'de-DE': DE_DE_PACKAGE,
};

/**
 * Hard-switch lookup. Returns null wanneer locale geen package heeft —
 * Pijler 3 evaluator valt dan terug op standaard-rules zonder heuristic-
 * augmentation. Geen union/merge.
 */
export function getHeuristicsForLocale(locale: Locale): HeuristicPackage | null {
  return REGISTRY[locale] ?? null;
}

/**
 * Convenience-wrapper: combineer locale-resolver + package-lookup. Per call
 * is dat 1-2 Prisma queries (cacheable binnen `getBrandContext` 5-min cache).
 */
export async function getHeuristicsForBrand(
  workspaceId: string,
): Promise<HeuristicPackage | null> {
  const locale = await resolveLocaleForBrand(workspaceId);
  return getHeuristicsForLocale(locale);
}

// Re-exports voor consumers
export type { HeuristicEntry, HeuristicPackage, HeuristicSeverity, HeuristicCategory, HeuristicRule } from './types';
export { CITATIONS, getCitation, type CitationKey, type Citation } from './citations';
export { SUPPORTED_LOCALES, type Locale, isSupportedLocale } from './locale-resolver';
