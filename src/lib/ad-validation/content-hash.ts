// =============================================================
// Ad Quality Validation — contentHash for idempotency-check
//
// SHA-256 over canonical JSON van (groups + primaryKeyword + platform
// + contentType + ruleVersion + judgeVersion + weightsVersion). Groups
// worden alphabetisch gesorteerd vóór serialisatie zodat zelfde input
// altijd zelfde hash geeft, ongeacht Map-iteration-order.
//
// Per spec sectie 3.2 — zonder version-suffixes in hash zou een rule-
// of judge-update GEEN re-score triggeren want existing rows hebben
// identieke contentHash. Versions inclusief = automatic invalidation.
// =============================================================

import { createHash } from 'crypto';
import type { ValidatorContext } from './types';
import { RULE_VERSION, JUDGE_VERSION, WEIGHTS_VERSION } from './versions';

export function contentHash(ctx: ValidatorContext): string {
  const sortedGroups = Object.fromEntries(
    [...ctx.groups.entries()].sort(([a], [b]) => a.localeCompare(b)),
  );
  const payload = {
    groups: sortedGroups,
    primaryKeyword: ctx.primaryKeyword ?? null,
    platform: ctx.platform,
    contentType: ctx.contentType,
    ruleVersion: RULE_VERSION,
    judgeVersion: JUDGE_VERSION,
    weightsVersion: WEIGHTS_VERSION,
  };
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
