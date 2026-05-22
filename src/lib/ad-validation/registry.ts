// =============================================================
// Ad Quality Validation — validator registry
//
// Per spec sectie 8: per-content-type lookup van { rules, judge,
// weights }. Nieuwe ad-types pluggen in zonder framework-wijziging:
// 1. Create rules file in rules/<platform>/<type>.ts
// 2. Create judge file in judge/<platform>-<type>-judge.ts
// 3. Register here in AD_VALIDATORS_BY_TYPE
//
// L1_WEIGHT/L2_WEIGHT per type (spec sectie 6.2):
//   - google/search-ad: 0.45 / 0.55 (mechanical correctness matters)
//   - google/display-ad: 0.35 / 0.65 (semantic visual-text-fit weegt)
//   - meta/facebook-ad: 0.30 / 0.70 (hook-stop-power primair)
//   - linkedin/linkedin-ad: 0.40 / 0.60
// =============================================================

import type { ValidatorEntry } from './types';

// Lazy-import strategy: rule/judge modules pas inladen wanneer
// gevraagd, voorkomt circular imports + onnodige bundle-size.
export function getValidator(contentType: string): ValidatorEntry | null {
  return AD_VALIDATORS_BY_TYPE[contentType] ?? null;
}

// Populated by registerValidator() calls at module-load — see
// rules/google/search-ad.ts en judge/google-search-judge.ts.
const AD_VALIDATORS_BY_TYPE: Record<string, ValidatorEntry> = {};

export function registerValidator(contentType: string, entry: ValidatorEntry): void {
  AD_VALIDATORS_BY_TYPE[contentType] = entry;
}

export function listRegisteredTypes(): string[] {
  return Object.keys(AD_VALIDATORS_BY_TYPE);
}
