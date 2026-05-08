// nl-BE package — Δ-2 sub-cluster B-3
//
// Programmatisch geconstrueerd uit nl-NL base + whitelist-filter + extras.
// Per ADR-3 hard-switch principe: het eindresultaat is een bevroren unit
// dat bij read-time geen union/merge meer doet — één-keer-aan-startup
// build, gecached in registry-object.
//
// Build-stappen:
//   1. Take inherited NL_NL_PACKAGE categories
//   2. Filter elke entry waarvan `term` in NL_BE_WHITELIST_FROM_NL_NL zit
//   3. Append BE-specific extras (corporate-fluff-extra + superlatives-extra)
//   4. Object.freeze en exporteer

import type { HeuristicEntry, HeuristicPackage, HeuristicCategory } from '../types';
import { NL_NL_PACKAGE } from '../nl-NL';
import { NL_BE_WHITELIST_FROM_NL_NL } from './nl-words-whitelisted';
import { NL_BE_CORPORATE_FLUFF_EXTRA } from './corporate-fluff-extra';
import { NL_BE_SUPERLATIVES_EXTRA } from './superlatives-extra';

function filterWhitelist(entries: HeuristicEntry[]): HeuristicEntry[] {
  return entries.filter((e) => !NL_BE_WHITELIST_FROM_NL_NL.has(e.term.toLowerCase()));
}

const baseCategories = NL_NL_PACKAGE.categories;

const beCategories: Partial<Record<HeuristicCategory, HeuristicEntry[]>> = {
  'corporate-fluff': [
    ...filterWhitelist(baseCategories['corporate-fluff'] ?? []),
    ...NL_BE_CORPORATE_FLUFF_EXTRA,
  ],
  superlatives: [
    ...filterWhitelist(baseCategories.superlatives ?? []),
    ...NL_BE_SUPERLATIVES_EXTRA,
  ],
  fillers: filterWhitelist(baseCategories.fillers ?? []),
  'vague-quality': filterWhitelist(baseCategories['vague-quality'] ?? []),
  'risky-comparatives': filterWhitelist(baseCategories['risky-comparatives'] ?? []),
};

export const NL_BE_PACKAGE: HeuristicPackage = Object.freeze({
  locale: 'nl-BE',
  categories: beCategories,
});
