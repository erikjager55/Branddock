// =============================================================
// Ad Quality Validation — version constants for cache invalidation
//
// Per spec sectie 3.2: contentHash hashes the groups PLUS these three
// version strings. Bump on any breaking change:
//
// - RULE_VERSION: bump when L1 rule-set semantics change
//   (added/removed rules, severity changes). Existing AdQualityScore
//   rows become stale but are kept for audit.
//
// - JUDGE_VERSION: bump when L2 judge prompts or output schema change.
//
// - WEIGHTS_VERSION: bump when L1_WEIGHT/L2_WEIGHT or threshold mapping
//   (Poor/Average/Good/Excellent) change.
//
// Constants live in code (not DB) — version bumps are git-deployable
// and diff-trackable. No runtime config override.
// =============================================================

export const RULE_VERSION = 'v1';
export const JUDGE_VERSION = 'v1';
export const WEIGHTS_VERSION = 'v1';
