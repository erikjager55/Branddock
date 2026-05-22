// =============================================================
// Shared L1 rule — char-overflow per asset
//
// Factory: gegeven een lijst van (groupName, cap) pairs en een
// ruleId-prefix, generate één Rule die per overschreden asset een
// RuleResult emit. Hergebruikt over search-ad, display-ad, etc.
// =============================================================

import type { Rule, RuleResult, ValidatorContext } from '../../types';

export interface CharOverflowSpec {
  group: string;
  cap: number;
  /** Label voor de message ("Headline 1" / "Description") */
  label: string;
}

export function makeCharOverflowRule(
  contentTypePrefix: string,
  specs: CharOverflowSpec[],
): Rule {
  return (ctx: ValidatorContext): RuleResult[] => {
    const results: RuleResult[] = [];
    for (const { group, cap, label } of specs) {
      const content = ctx.groups.get(group) ?? '';
      if (content.length > cap) {
        results.push({
          ruleId: `${contentTypePrefix}.char-overflow.${group}`,
          category: 'mechanical',
          status: 'fail',
          message: `${label} is ${content.length} tekens — max ${cap} per Google policy.`,
          suggestion: `Verkort naar maximaal ${cap} tekens (${content.length - cap} weg te halen).`,
          fieldGroup: group,
        });
      } else {
        results.push({
          ruleId: `${contentTypePrefix}.char-overflow.${group}`,
          category: 'mechanical',
          status: 'pass',
          message: `${label} binnen ${cap}-char limit (${content.length}).`,
          fieldGroup: group,
        });
      }
    }
    return results;
  };
}
