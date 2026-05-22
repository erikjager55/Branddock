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
import { displayAdRules } from './rules/google/display-ad';
import { googleDisplayAdJudge } from './judge/google-display-judge';

let isRegistered = false;

export function setupAdValidators(): void {
  if (isRegistered) return;

  // A.5.1 — search-ad (commits ab2f45c2 + aa11f1ed)
  registerValidator('search-ad', {
    rules: searchAdRules,
    judge: googleSearchAdJudge,
    weights: { l1: 0.45, l2: 0.55 },
  });

  // A.5.2 — display-ad (RDA, post-migration). L1=0.35/L2=0.65 per
  // ADR addendum (semantic visual-text-fit weighs heavier voor RDA).
  registerValidator('display-ad', {
    rules: displayAdRules,
    judge: googleDisplayAdJudge,
    weights: { l1: 0.35, l2: 0.65 },
  });

  // Future: facebook-ad (A.5.3), linkedin-ad (A.5.4), native-ad,
  // retargeting-ad — registered in volgende sub-fases.

  isRegistered = true;
}
