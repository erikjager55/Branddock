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
import { facebookAdRules } from './rules/meta/facebook-ad';
import { metaFacebookAdJudge } from './judge/meta-facebook-judge';
import { linkedinAdRules } from './rules/linkedin/linkedin-ad';
import { linkedinAdJudge } from './judge/linkedin-ad-judge';
import { nativeAdRules } from './rules/native/native-ad';
import { nativeAdJudge } from './judge/native-ad-judge';
import { retargetingAdRules } from './rules/meta/retargeting-ad';
import { retargetingAdJudge } from './judge/retargeting-ad-judge';

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

  // A.5.3 — facebook-ad (Meta link-card). L1=0.30/L2=0.70 per spec
  // (hook-stop-power is dominant signal voor feed-scrolling).
  registerValidator('facebook-ad', {
    rules: facebookAdRules,
    judge: metaFacebookAdJudge,
    weights: { l1: 0.30, l2: 0.70 },
  });

  // A.5.4 — linkedin-ad (Sponsored Post). L1=0.40/L2=0.60 per spec
  // (professional-tone gating weegt zwaarder dan andere social ads).
  registerValidator('linkedin-ad', {
    rules: linkedinAdRules,
    judge: linkedinAdJudge,
    weights: { l1: 0.40, l2: 0.60 },
  });

  // A.5.5 — native-ad (publisher-style sponsored article).
  // L1=0.40/L2=0.60 — structural rules (brand-position, mention-count,
  // disclosure) zijn hard, maar editorial naturalness is L2-dominant.
  registerValidator('native-ad', {
    rules: nativeAdRules,
    judge: nativeAdJudge,
    weights: { l1: 0.4, l2: 0.6 },
  });

  // A.5.6 — retargeting-ad (Meta, 3 audience scenarios × 6 fields).
  // L1=0.35/L2=0.65 — scenario-emotional-fit en novelty/objection-
  // removal zijn primair semantische judgements; structural rules
  // (no-discount op past-customer, no-urgency op cart-abandoner)
  // zijn hard maar dekken slechts deelaspect.
  registerValidator('retargeting-ad', {
    rules: retargetingAdRules,
    judge: retargetingAdJudge,
    weights: { l1: 0.35, l2: 0.65 },
  });

  isRegistered = true;
}
