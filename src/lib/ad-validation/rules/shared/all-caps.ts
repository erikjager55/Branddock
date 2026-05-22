// =============================================================
// Shared L1 rule — ALL CAPS detection
//
// Google + Meta + LinkedIn policies verbieden complete ALL CAPS in
// headlines (= aggressive ads). Acronyms (NASA, SaaS) zijn OK want
// die zijn naturally uppercase woorden. Detectie: >70% van de chars
// is upper-case én >3 chars lengte.
// =============================================================

import type { Rule, RuleResult, ValidatorContext } from '../../types';

export interface AllCapsSpec {
  group: string;
  label: string;
}

export function makeAllCapsRule(contentTypePrefix: string, specs: AllCapsSpec[]): Rule {
  return (ctx: ValidatorContext): RuleResult[] => {
    const results: RuleResult[] = [];
    for (const { group, label } of specs) {
      const content = (ctx.groups.get(group) ?? '').trim();
      if (content.length < 4) {
        results.push({
          ruleId: `${contentTypePrefix}.all-caps.${group}`,
          category: 'mechanical',
          status: 'pass',
          message: `${label} te kort voor ALL CAPS check.`,
          fieldGroup: group,
        });
        continue;
      }
      const letters = content.replace(/[^A-Za-z]/g, '');
      if (letters.length === 0) {
        results.push({
          ruleId: `${contentTypePrefix}.all-caps.${group}`,
          category: 'mechanical',
          status: 'pass',
          message: `${label} bevat geen letters.`,
          fieldGroup: group,
        });
        continue;
      }
      const upperRatio = letters.replace(/[^A-Z]/g, '').length / letters.length;
      if (upperRatio > 0.7) {
        results.push({
          ruleId: `${contentTypePrefix}.all-caps.${group}`,
          category: 'mechanical',
          status: 'warn',
          message: `${label} is grotendeels ALL CAPS (${Math.round(upperRatio * 100)}%) — Google policy schendt, kan ad-disapproval veroorzaken.`,
          suggestion: 'Gebruik Title Case of sentence case. Acronyms (SaaS, NASA) mogen wel.',
          fieldGroup: group,
        });
      } else {
        results.push({
          ruleId: `${contentTypePrefix}.all-caps.${group}`,
          category: 'mechanical',
          status: 'pass',
          message: `${label} gebruikt normale casing.`,
          fieldGroup: group,
        });
      }
    }
    return results;
  };
}
