// =============================================================
// L1 rule-set — LinkedIn Sponsored Post (single-image ad)
//
// Per spec sectie 4.5 placeholder. Vergelijkbaar met facebook-ad
// maar met professional-tone gating (LinkedIn audience verwacht
// formal-corporate register, geen casual contractions / slang).
//
// Mechanical: char-overflow (headline ≤70, body ≤150 single-image
// OR ≤600 extended-body mode, description ≤100, cta-button), ALL
// CAPS warn, banned-phrases warn
//
// Structural: informal-contractions warn (don't, won't, can't),
// slang-detection warn (vibe, lit, etc.), too-many-emojis warn,
// coverage rules
//
// Aggregate-weights (spec sectie 6.2): L1=0.40, L2=0.60.
// =============================================================

import type { Rule, RuleResult, ValidatorContext } from '../../types';
import { makeCharOverflowRule } from '../shared/char-overflow';
import { makeAllCapsRule } from '../shared/all-caps';
import { makeBannedPhrasesRule } from '../shared/banned-phrases';

const PREFIX = 'linkedin-ad';

// ── Mechanical: char-overflow per asset ─────────────────────

const charOverflowRule = makeCharOverflowRule(PREFIX, [
  { group: 'body', cap: 600, label: 'Body (primary text)' }, // 150 single-image, 600 extended
  { group: 'headline', cap: 70, label: 'Headline' },
  { group: 'description', cap: 100, label: 'Description' },
  { group: 'cta-button', cap: 25, label: 'CTA button' },
]);

// ── Mechanical: ALL CAPS check ──────────────────────────────

const allCapsRule = makeAllCapsRule(PREFIX, [
  { group: 'headline', label: 'Headline' },
  { group: 'body', label: 'Body' },
  { group: 'cta-button', label: 'CTA button' },
]);

// ── Mechanical: banned phrases (! + superlatives) ───────────

const bannedPhrasesRule = makeBannedPhrasesRule(PREFIX, [
  { group: 'headline', label: 'Headline', checkExclamation: true },
  { group: 'body', label: 'Body', checkExclamation: false },
  { group: 'cta-button', label: 'CTA button', checkExclamation: true },
]);

// ── Structural: informal contractions warn ──────────────────
// LinkedIn audience verwacht formeler corporate register dan Facebook.
// Veel informal contractions (>3 in body) is een red flag.

const INFORMAL_CONTRACTIONS = [
  "don't", "won't", "can't", "shouldn't", "wouldn't", "couldn't",
  "isn't", "aren't", "wasn't", "weren't", "hasn't", "haven't",
  "you're", "we're", "they're", "i'm", "let's", "that's",
  "ain't", "gonna", "wanna", "gotta", "kinda", "sorta",
];

const informalContractionsRule: Rule = (ctx: ValidatorContext): RuleResult[] => {
  const body = (ctx.groups.get('body') ?? '').toLowerCase();
  if (body.trim().length === 0) return [];
  const matches = INFORMAL_CONTRACTIONS.filter((c) => body.includes(c));
  if (matches.length === 0) {
    return [
      {
        ruleId: `${PREFIX}.professional-tone.contractions`,
        category: 'structural',
        status: 'pass',
        message: 'Body gebruikt formele corporate register.',
        fieldGroup: 'body',
      },
    ];
  }
  if (matches.length >= 3) {
    return [
      {
        ruleId: `${PREFIX}.professional-tone.contractions`,
        category: 'structural',
        status: 'warn',
        message: `Body bevat ${matches.length} informele contracties (${matches.slice(0, 3).join(', ')}${matches.length > 3 ? '...' : ''}) — LinkedIn audience verwacht corporate tone.`,
        suggestion: 'Vervang contracties door volledige vormen ("don\'t" → "do not"). Meer corporate-passend voor B2B audience.',
        fieldGroup: 'body',
      },
    ];
  }
  return [
    {
      ruleId: `${PREFIX}.professional-tone.contractions`,
      category: 'structural',
      status: 'pass',
      message: `Body bevat ${matches.length} contracties — binnen acceptabel bereik voor LinkedIn.`,
      fieldGroup: 'body',
    },
  ];
};

// ── Structural: slang detection ─────────────────────────────

const SLANG_TERMS = [
  'vibe', 'vibes', 'lit', 'fire', 'slay', 'slaying',
  'lowkey', 'highkey', 'fr', 'no cap', 'periodt', 'tea',
  'bet', 'mood', 'big mood', 'iykyk', 'goat', 'mid',
];

const slangDetectionRule: Rule = (ctx: ValidatorContext): RuleResult[] => {
  const body = (ctx.groups.get('body') ?? '').toLowerCase();
  if (body.trim().length === 0) return [];
  const matches = SLANG_TERMS.filter((s) => new RegExp(`\\b${s}\\b`, 'i').test(body));
  if (matches.length === 0) {
    return [
      {
        ruleId: `${PREFIX}.professional-tone.slang`,
        category: 'structural',
        status: 'pass',
        message: 'Body gebruikt geen consumer slang.',
        fieldGroup: 'body',
      },
    ];
  }
  return [
    {
      ruleId: `${PREFIX}.professional-tone.slang`,
      category: 'structural',
      status: 'warn',
      message: `Body bevat slang termen (${matches.join(', ')}) — LinkedIn B2B audience verwacht corporate register.`,
      suggestion: 'Vervang slang door professional equivalent. Bv. "lit" → "outstanding", "vibe" → "atmosphere".',
      fieldGroup: 'body',
    },
  ];
};

// ── Structural: too many emojis ─────────────────────────────

const emojiCountRule: Rule = (ctx: ValidatorContext): RuleResult[] => {
  const body = ctx.groups.get('body') ?? '';
  if (body.trim().length === 0) return [];
  // Unicode emoji ranges (compact heuristic)
  const emojiCount = (body.match(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) ?? []).length;
  if (emojiCount > 3) {
    return [
      {
        ruleId: `${PREFIX}.professional-tone.emoji-count`,
        category: 'structural',
        status: 'warn',
        message: `Body bevat ${emojiCount} emojis — LinkedIn corporate context tolereert ~0-3 emojis voor visual breaks, niet decoratie.`,
        suggestion: 'Verminder naar maximaal 3 strategisch geplaatste emojis, of haal allemaal weg voor formelere tone.',
        fieldGroup: 'body',
      },
    ];
  }
  return [
    {
      ruleId: `${PREFIX}.professional-tone.emoji-count`,
      category: 'structural',
      status: 'pass',
      message: `Body bevat ${emojiCount} emoji${emojiCount === 1 ? '' : 's'} — appropriate voor LinkedIn.`,
      fieldGroup: 'body',
    },
  ];
};

// ── Coverage rules ──────────────────────────────────────────

function makeCoverageRule(group: string, label: string): Rule {
  return (ctx: ValidatorContext): RuleResult[] => {
    const filled = (ctx.groups.get(group) ?? '').trim().length > 0;
    if (filled) {
      return [
        {
          ruleId: `${PREFIX}.coverage.${group}`,
          category: 'coverage',
          status: 'pass',
          message: `${label} gevuld.`,
          fieldGroup: group,
        },
      ];
    }
    return [
      {
        ruleId: `${PREFIX}.coverage.${group}`,
        category: 'coverage',
        status: 'fail',
        message: `${label} ontbreekt — vereist door LinkedIn Sponsored Post format.`,
        fieldGroup: group,
      },
    ];
  };
}

const coverageBodyRule = makeCoverageRule('body', 'Body (primary text)');
const coverageHeadlineRule = makeCoverageRule('headline', 'Headline');
const coverageCtaButtonRule = makeCoverageRule('cta-button', 'CTA button');

const coverageImageRule: Rule = (ctx: ValidatorContext): RuleResult[] => {
  if (ctx.hasImage) {
    return [
      {
        ruleId: `${PREFIX}.coverage.image`,
        category: 'coverage',
        status: 'pass',
        message: 'Hero image toegevoegd.',
      },
    ];
  }
  return [
    {
      ruleId: `${PREFIX}.coverage.image`,
      category: 'coverage',
      status: 'fail',
      message: 'Hero image ontbreekt — LinkedIn Sponsored Post vereist hero (1.91:1, 1200×627 aanbevolen).',
    },
  ];
};

// ── Export rules-array voor registry ────────────────────────

export const linkedinAdRules: Rule[] = [
  charOverflowRule,
  allCapsRule,
  bannedPhrasesRule,
  informalContractionsRule,
  slangDetectionRule,
  emojiCountRule,
  coverageBodyRule,
  coverageHeadlineRule,
  coverageCtaButtonRule,
  coverageImageRule,
];
