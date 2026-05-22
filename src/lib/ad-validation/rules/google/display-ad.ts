// =============================================================
// L1 rule-set — Google Responsive Display Ad (RDA)
//
// 16 rules per ADR 2026-05-22-ad-quality-validation addendum +
// spec sectie 4.5 (na RDA migration commit 10ff435e). Vervangt
// legacy per-size rules (geen vaste sizes meer in RDA).
//
// Mechanical: char-overflow per asset-type (short-headline ≤30,
// long-headline ≤90, description ≤90, business-name ≤25), ALL CAPS
// warn, exclamation + banned-superlatives warn.
//
// Structural: duplicate-short-headlines (Jaccard ≥0.8 fail),
// duplicate-descriptions fail, image-direction-no-text-overlay warn.
//
// Coverage: short-headlines-min fail, short-headlines-full warn
// (5 voor Excellent Ad Strength), long-headline fail, descriptions-
// min fail, descriptions-full warn, business-name fail, image fail.
//
// Aggregate-weights (ADR addendum): L1=0.35, L2=0.65 — semantic
// visual-text-fit weighs heavier voor RDA dan mechanical correctness.
// =============================================================

import type { Rule, RuleResult, ValidatorContext } from '../../types';
import { makeCharOverflowRule } from '../shared/char-overflow';
import { makeAllCapsRule } from '../shared/all-caps';
import { makeBannedPhrasesRule } from '../shared/banned-phrases';
import { makeDuplicateRule } from '../shared/duplicate-detection';

const PREFIX = 'display-ad';

// ── Mechanical: char-overflow per asset-type ────────────────

const charOverflowRule = makeCharOverflowRule(PREFIX, [
  { group: 'short-headline-1', cap: 30, label: 'Short headline 1' },
  { group: 'short-headline-2', cap: 30, label: 'Short headline 2' },
  { group: 'short-headline-3', cap: 30, label: 'Short headline 3' },
  { group: 'short-headline-4', cap: 30, label: 'Short headline 4' },
  { group: 'short-headline-5', cap: 30, label: 'Short headline 5' },
  { group: 'long-headline', cap: 90, label: 'Long headline' },
  { group: 'description-1', cap: 90, label: 'Description 1' },
  { group: 'description-2', cap: 90, label: 'Description 2' },
  { group: 'description-3', cap: 90, label: 'Description 3' },
  { group: 'description-4', cap: 90, label: 'Description 4' },
  { group: 'description-5', cap: 90, label: 'Description 5' },
  { group: 'business-name', cap: 25, label: 'Business name' },
]);

// ── Mechanical: ALL CAPS check op headlines ─────────────────

const allCapsRule = makeAllCapsRule(PREFIX, [
  { group: 'short-headline-1', label: 'Short headline 1' },
  { group: 'short-headline-2', label: 'Short headline 2' },
  { group: 'short-headline-3', label: 'Short headline 3' },
  { group: 'short-headline-4', label: 'Short headline 4' },
  { group: 'short-headline-5', label: 'Short headline 5' },
  { group: 'long-headline', label: 'Long headline' },
]);

// ── Mechanical: banned phrases (!, superlatives) ────────────

const bannedPhrasesRule = makeBannedPhrasesRule(PREFIX, [
  { group: 'short-headline-1', label: 'Short headline 1', checkExclamation: true },
  { group: 'short-headline-2', label: 'Short headline 2', checkExclamation: true },
  { group: 'short-headline-3', label: 'Short headline 3', checkExclamation: true },
  { group: 'short-headline-4', label: 'Short headline 4', checkExclamation: true },
  { group: 'short-headline-5', label: 'Short headline 5', checkExclamation: true },
  { group: 'long-headline', label: 'Long headline', checkExclamation: true },
  { group: 'description-1', label: 'Description 1', checkExclamation: false },
  { group: 'description-2', label: 'Description 2', checkExclamation: false },
  { group: 'description-3', label: 'Description 3', checkExclamation: false },
  { group: 'description-4', label: 'Description 4', checkExclamation: false },
  { group: 'description-5', label: 'Description 5', checkExclamation: false },
]);

// ── Structural: duplicate-headlines / -descriptions ─────────

const duplicateHeadlinesRule = makeDuplicateRule(PREFIX, {
  groups: ['short-headline-1', 'short-headline-2', 'short-headline-3', 'short-headline-4', 'short-headline-5'],
  poolLabel: 'Short-headlines',
  threshold: 0.8,
  severity: 'fail',
});

const duplicateDescriptionsRule = makeDuplicateRule(PREFIX, {
  groups: ['description-1', 'description-2', 'description-3', 'description-4', 'description-5'],
  poolLabel: 'Descriptions',
  threshold: 0.8,
  severity: 'fail',
});

// ── Structural: image-direction-no-text-overlay ─────────────
// Google policy: ads met >20% text-on-image worden downranked.
// Detect regex match op image-prose mentioning text-overlay/logo-
// placement/tagline-on-image.

const TEXT_OVERLAY_PATTERN = /\b(text\s?overlay|logo\s?(top|bottom|left|right|center)|tagline\s?(on|overlaid|burned)|headline\s?on\s?image|caption\s?burned|burned-in\s?(text|caption))\b/i;

const imageDirectionNoTextOverlayRule: Rule = (ctx: ValidatorContext): RuleResult[] => {
  const imagePrompt = ctx.groups.get('image') ?? '';
  if (imagePrompt.trim().length === 0) {
    return [
      {
        ruleId: `${PREFIX}.image-direction-no-text-overlay`,
        category: 'structural',
        status: 'pass',
        message: 'Image direction is leeg — geen text-overlay-risico.',
      },
    ];
  }
  const match = imagePrompt.match(TEXT_OVERLAY_PATTERN);
  if (match) {
    return [
      {
        ruleId: `${PREFIX}.image-direction-no-text-overlay`,
        category: 'structural',
        status: 'warn',
        message: `Image direction noemt "${match[0]}" — Google downranked ads met >20% text-on-image.`,
        suggestion: `Copy hoort in headlines/descriptions, niet baked into image. Verwijder text-overlay specificaties uit visual direction.`,
        fieldGroup: 'image',
      },
    ];
  }
  return [
    {
      ruleId: `${PREFIX}.image-direction-no-text-overlay`,
      category: 'structural',
      status: 'pass',
      message: 'Image direction bevat geen text-overlay specificaties.',
      fieldGroup: 'image',
    },
  ];
};

// ── Coverage rules ──────────────────────────────────────────

function countFilled(ctx: ValidatorContext, groups: string[]): number {
  return groups.filter((g) => (ctx.groups.get(g) ?? '').trim().length > 0).length;
}

const coverageShortHeadlinesMinRule: Rule = (ctx: ValidatorContext): RuleResult[] => {
  const filled = countFilled(ctx, [
    'short-headline-1', 'short-headline-2', 'short-headline-3',
    'short-headline-4', 'short-headline-5',
  ]);
  if (filled >= 1) {
    return [
      {
        ruleId: `${PREFIX}.coverage.short-headlines-min`,
        category: 'coverage',
        status: 'pass',
        message: `${filled}/5 short headlines gevuld — Google RDA minimum gehaald.`,
      },
    ];
  }
  return [
    {
      ruleId: `${PREFIX}.coverage.short-headlines-min`,
      category: 'coverage',
      status: 'fail',
      message: 'Geen short headlines gevuld — Google RDA vereist minimum 1.',
      suggestion: 'Vul minimum short-headline-1 met een korte (≤30 char) hook.',
    },
  ];
};

const coverageShortHeadlinesFullRule: Rule = (ctx: ValidatorContext): RuleResult[] => {
  const filled = countFilled(ctx, [
    'short-headline-1', 'short-headline-2', 'short-headline-3',
    'short-headline-4', 'short-headline-5',
  ]);
  if (filled === 5) {
    return [
      {
        ruleId: `${PREFIX}.coverage.short-headlines-full`,
        category: 'coverage',
        status: 'pass',
        message: 'Alle 5 short headlines gevuld — Excellent Ad Strength criterium gehaald.',
      },
    ];
  }
  if (filled === 0) {
    // already covered by min-rule
    return [];
  }
  return [
    {
      ruleId: `${PREFIX}.coverage.short-headlines-full`,
      category: 'coverage',
      status: 'warn',
      message: `Slechts ${filled}/5 short headlines gevuld. Volle 5 distincte hook-angles drives Ad Strength naar Excellent.`,
      suggestion: `Vul short-headline-${filled + 1} t/m 5 met DIFFERENT angles (claim / question / stat / contrarian / outcome).`,
    },
  ];
};

const coverageLongHeadlineRule: Rule = (ctx: ValidatorContext): RuleResult[] => {
  const filled = (ctx.groups.get('long-headline') ?? '').trim().length > 0;
  if (filled) {
    return [
      {
        ruleId: `${PREFIX}.coverage.long-headline`,
        category: 'coverage',
        status: 'pass',
        message: 'Long headline gevuld.',
      },
    ];
  }
  return [
    {
      ruleId: `${PREFIX}.coverage.long-headline`,
      category: 'coverage',
      status: 'fail',
      message: 'Long headline ontbreekt — vereist door Google RDA voor placements die extended text toestaan.',
      suggestion: 'Vul long-headline (≤90 chars) met standalone value-prop (geen verlenging van short-headline-1).',
      fieldGroup: 'long-headline',
    },
  ];
};

const coverageDescriptionsMinRule: Rule = (ctx: ValidatorContext): RuleResult[] => {
  const filled = countFilled(ctx, [
    'description-1', 'description-2', 'description-3', 'description-4', 'description-5',
  ]);
  if (filled >= 1) {
    return [
      {
        ruleId: `${PREFIX}.coverage.descriptions-min`,
        category: 'coverage',
        status: 'pass',
        message: `${filled}/5 descriptions gevuld — Google RDA minimum gehaald.`,
      },
    ];
  }
  return [
    {
      ruleId: `${PREFIX}.coverage.descriptions-min`,
      category: 'coverage',
      status: 'fail',
      message: 'Geen descriptions gevuld — Google RDA vereist minimum 1.',
      suggestion: 'Vul minimum description-1 met proof + outcome (≤90 chars).',
    },
  ];
};

const coverageDescriptionsFullRule: Rule = (ctx: ValidatorContext): RuleResult[] => {
  const filled = countFilled(ctx, [
    'description-1', 'description-2', 'description-3', 'description-4', 'description-5',
  ]);
  if (filled === 5) {
    return [
      {
        ruleId: `${PREFIX}.coverage.descriptions-full`,
        category: 'coverage',
        status: 'pass',
        message: 'Alle 5 descriptions gevuld — Excellent Ad Strength criterium gehaald.',
      },
    ];
  }
  if (filled === 0) {
    return [];
  }
  return [
    {
      ruleId: `${PREFIX}.coverage.descriptions-full`,
      category: 'coverage',
      status: 'warn',
      message: `Slechts ${filled}/5 descriptions gevuld. Volle 5 boost Ad Strength diversity-signal.`,
      suggestion: `Vul description-${filled + 1} t/m 5 met UNIEKE info per slot (proof / feature / social-proof / risk-reducer / urgency).`,
    },
  ];
};

const coverageBusinessNameRule: Rule = (ctx: ValidatorContext): RuleResult[] => {
  const filled = (ctx.groups.get('business-name') ?? '').trim().length > 0;
  if (filled) {
    return [
      {
        ruleId: `${PREFIX}.coverage.business-name`,
        category: 'coverage',
        status: 'pass',
        message: 'Business name gevuld.',
      },
    ];
  }
  return [
    {
      ruleId: `${PREFIX}.coverage.business-name`,
      category: 'coverage',
      status: 'fail',
      message: 'Business name ontbreekt — vereist door Google RDA (verschijnt in ad header).',
      suggestion: 'Vul business-name met brand-name exact zoals het publiek moet verschijnen (≤25 chars).',
      fieldGroup: 'business-name',
    },
  ];
};

const coverageImageRule: Rule = (ctx: ValidatorContext): RuleResult[] => {
  if (ctx.hasImage) {
    return [
      {
        ruleId: `${PREFIX}.coverage.image`,
        category: 'coverage',
        status: 'pass',
        message: 'Image asset aanwezig (landscape 1.91:1 + square 1:1 crops).',
      },
    ];
  }
  return [
    {
      ruleId: `${PREFIX}.coverage.image`,
      category: 'coverage',
      status: 'fail',
      message: 'Image asset ontbreekt — Google RDA vereist landscape 1.91:1 + square 1:1.',
      suggestion: 'Genereer of upload hero image. Visual pipeline produceert beide aspect ratios uit één art-direction.',
    },
  ];
};

// ── Export rules-array voor registry ────────────────────────

export const displayAdRules: Rule[] = [
  charOverflowRule,
  allCapsRule,
  bannedPhrasesRule,
  duplicateHeadlinesRule,
  duplicateDescriptionsRule,
  imageDirectionNoTextOverlayRule,
  coverageShortHeadlinesMinRule,
  coverageShortHeadlinesFullRule,
  coverageLongHeadlineRule,
  coverageDescriptionsMinRule,
  coverageDescriptionsFullRule,
  coverageBusinessNameRule,
  coverageImageRule,
];
