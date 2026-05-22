// =============================================================
// Shared L1 rule — duplicate / near-duplicate detection
//
// Google's ML penaliseert paraphrase-clusters in headline-pools (=
// lage "diversity" signal). Detectie via Jaccard similarity op
// token-sets. Default threshold: ≥0.8 = quasi-duplicate, fail.
//
// Voor zelfde-string exact-dup is similarity = 1.0. Voor "Save 40%"
// vs "Save 50%" similarity ~ 0.5 = OK (verschillende getallen).
// =============================================================

import type { Rule, RuleResult, ValidatorContext } from '../../types';

function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let intersect = 0;
  for (const w of a) if (b.has(w)) intersect += 1;
  const union = a.size + b.size - intersect;
  return intersect / union;
}

export interface DuplicateSpec {
  /** Groups to compare pairwise — e.g. ['headline-1', 'headline-2', 'headline-3']. */
  groups: string[];
  /** Human-readable name for the pool ("Headlines", "Descriptions"). */
  poolLabel: string;
  /** Jaccard threshold above which two are considered duplicates (default 0.8). */
  threshold?: number;
  /** Severity: 'fail' for required-distinct pools, 'warn' otherwise. */
  severity?: 'fail' | 'warn';
}

export function makeDuplicateRule(contentTypePrefix: string, spec: DuplicateSpec): Rule {
  const threshold = spec.threshold ?? 0.8;
  const severity = spec.severity ?? 'fail';

  return (ctx: ValidatorContext): RuleResult[] => {
    const filled = spec.groups
      .map((g) => ({ group: g, content: (ctx.groups.get(g) ?? '').trim() }))
      .filter((x) => x.content.length > 0);

    if (filled.length < 2) {
      return [
        {
          ruleId: `${contentTypePrefix}.duplicate-${spec.poolLabel.toLowerCase()}`,
          category: 'structural',
          status: 'pass',
          message: `${spec.poolLabel} pool heeft <2 gevulde items — geen dup-risico.`,
        },
      ];
    }

    const tokenized = filled.map((x) => ({ ...x, tokens: tokenize(x.content) }));
    const duplicates: Array<{ a: string; b: string; similarity: number }> = [];

    for (let i = 0; i < tokenized.length; i++) {
      for (let j = i + 1; j < tokenized.length; j++) {
        const sim = jaccard(tokenized[i].tokens, tokenized[j].tokens);
        if (sim >= threshold) {
          duplicates.push({
            a: tokenized[i].group,
            b: tokenized[j].group,
            similarity: sim,
          });
        }
      }
    }

    if (duplicates.length === 0) {
      return [
        {
          ruleId: `${contentTypePrefix}.duplicate-${spec.poolLabel.toLowerCase()}`,
          category: 'structural',
          status: 'pass',
          message: `${spec.poolLabel} pool heeft ${filled.length} distincte items.`,
        },
      ];
    }

    return duplicates.map((d) => ({
      ruleId: `${contentTypePrefix}.duplicate-${spec.poolLabel.toLowerCase()}.${d.a}-${d.b}`,
      category: 'structural',
      status: severity,
      message: `${spec.poolLabel} ${d.a} en ${d.b} zijn (bijna) identiek (Jaccard ${d.similarity.toFixed(2)}) — verspilde rotation-slot, Google penaliseert diversity.`,
      suggestion: `Herschrijf één van beide met een ander hook-type (claim / question / stat / contrarian / outcome).`,
      fieldGroup: d.b,
    }));
  };
}
