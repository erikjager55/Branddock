// =============================================================
// Shared L1 rule — banned phrases (exclamation in headlines,
// unsubstantiated superlatives, generic clickbait)
//
// Google + Meta beide verbieden:
//   - `!` in headlines (gives aggressive feel, downranks Quality Score)
//   - Unsubstantiated superlatives ("Best", "#1", "Top-rated", "Nummer 1")
//     zonder een proof-marker erbij (zoals "according to X" or "rated
//     #1 by Y")
//
// Detectie: regex matching met case-insensitive flag. Proof-marker
// = "\baccording to\b|\brated by\b|\bin (1[89]|20)\d{2}\b" — als
// content één van die heeft binnen 60 chars van de superlative, OK.
// =============================================================

import type { Rule, RuleResult, ValidatorContext } from '../../types';

const BANNED_SUPERLATIVES = /\b(best|#1|nummer\s*1|top-rated|topgewaardeerd|finest|premier)\b/i;
const PROOF_MARKER = /\b(according to|rated|reviewed|cited|as seen|featured|in\s*(19|20)\d{2})\b/i;
const EXCLAMATION = /!/;

export interface BannedPhraseSpec {
  group: string;
  label: string;
  /** When true, check for `!`; when false, only superlatives. */
  checkExclamation?: boolean;
}

export function makeBannedPhrasesRule(
  contentTypePrefix: string,
  specs: BannedPhraseSpec[],
): Rule {
  return (ctx: ValidatorContext): RuleResult[] => {
    const results: RuleResult[] = [];
    for (const { group, label, checkExclamation = true } of specs) {
      const content = (ctx.groups.get(group) ?? '').trim();
      if (content.length === 0) {
        // skip empty — coverage rule handles "missing" case
        continue;
      }

      const issues: string[] = [];
      if (checkExclamation && EXCLAMATION.test(content)) {
        issues.push(`bevat "!" — Google staat geen exclamation marks in headlines toe`);
      }
      const superlativeMatch = content.match(BANNED_SUPERLATIVES);
      if (superlativeMatch && !PROOF_MARKER.test(content)) {
        issues.push(`bevat ongesubstantieerde superlatief "${superlativeMatch[0]}"`);
      }

      if (issues.length > 0) {
        results.push({
          ruleId: `${contentTypePrefix}.banned-phrases.${group}`,
          category: 'mechanical',
          status: 'warn',
          message: `${label} ${issues.join(' + ')}.`,
          suggestion: 'Verwijder superlatieven zonder bewijs, of voeg proof-marker toe (bv. "rated #1 by [source]"). Vermijd "!" in headlines.',
          fieldGroup: group,
        });
      } else {
        results.push({
          ruleId: `${contentTypePrefix}.banned-phrases.${group}`,
          category: 'mechanical',
          status: 'pass',
          message: `${label} bevat geen banned phrases.`,
          fieldGroup: group,
        });
      }
    }
    return results;
  };
}
