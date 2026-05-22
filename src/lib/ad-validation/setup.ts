// =============================================================
// Ad Quality Validation — registry setup (side-effects)
//
// Importing this module registers all validators in the registry.
// Imported once from runner.ts to ensure registration happens before
// first use. Geen circular import met de rule/judge modules.
//
// Pattern: server-side singleton — registry is process-wide, calling
// setup() meerdere keren is idempotent (re-register overwrites zelfde
// entry).
// =============================================================

import { registerValidator } from './registry';
import { searchAdRules } from './rules/google/search-ad';
import { googleSearchAdJudge } from './judge/google-search-judge';

let isRegistered = false;

export function setupAdValidators(): void {
  if (isRegistered) return;

  registerValidator('search-ad', {
    rules: searchAdRules,
    judge: googleSearchAdJudge,
    weights: { l1: 0.45, l2: 0.55 },
  });

  // Future: display-ad (RDA), facebook-ad, linkedin-ad, native-ad,
  // retargeting-ad — registered in volgende sub-fases.

  isRegistered = true;
}
