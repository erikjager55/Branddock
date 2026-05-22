// =============================================================
// L1 rule-set — Google Search Ad (Responsive Search Ads / RSA)
//
// 15 rules per spec sectie 4.4:
//   Mechanical: char-overflow per veld (H1/H2/H3 ≤30, D1/D2 ≤90,
//   path-1/2 ≤15, sitelink-N-title ≤25, sitelink-N-description ≤35),
//   ALL CAPS warn, banned-phrases warn
//   Structural: duplicate-headlines fail, duplicate-descriptions
//   warn, sitelink-restating-title warn, keyword-in-h1 warn,
//   keyword-in-d1 warn
//   Coverage: minimum 3 headlines fail, minimum 2 descriptions fail,
//   minimum 4 sitelinks warn
//
// Aggregate-weights (spec sectie 6.2): L1=0.45, L2=0.55 — mechanical
// correctness weighs extra omdat Google policy violations direct
// ad-disapproval kunnen veroorzaken.
// =============================================================

import type { Rule, RuleResult, ValidatorContext } from '../../types';
import { makeCharOverflowRule } from '../shared/char-overflow';
import { makeAllCapsRule } from '../shared/all-caps';
import { makeBannedPhrasesRule } from '../shared/banned-phrases';
import { makeDuplicateRule } from '../shared/duplicate-detection';

const PREFIX = 'search-ad';

// ── Mechanical: char-overflow per asset ─────────────────────

const charOverflowRule = makeCharOverflowRule(PREFIX, [
  { group: 'headline-1', cap: 30, label: 'Headline 1' },
  { group: 'headline-2', cap: 30, label: 'Headline 2' },
  { group: 'headline-3', cap: 30, label: 'Headline 3' },
  { group: 'description-1', cap: 90, label: 'Description 1' },
  { group: 'description-2', cap: 90, label: 'Description 2' },
  { group: 'path-1', cap: 15, label: 'Display path 1' },
  { group: 'path-2', cap: 15, label: 'Display path 2' },
  { group: 'sitelink-1-title', cap: 25, label: 'Sitelink 1 title' },
  { group: 'sitelink-1-description', cap: 35, label: 'Sitelink 1 description' },
  { group: 'sitelink-2-title', cap: 25, label: 'Sitelink 2 title' },
  { group: 'sitelink-2-description', cap: 35, label: 'Sitelink 2 description' },
  { group: 'sitelink-3-title', cap: 25, label: 'Sitelink 3 title' },
  { group: 'sitelink-3-description', cap: 35, label: 'Sitelink 3 description' },
  { group: 'sitelink-4-title', cap: 25, label: 'Sitelink 4 title' },
  { group: 'sitelink-4-description', cap: 35, label: 'Sitelink 4 description' },
]);

// ── Mechanical: ALL CAPS check op headlines ─────────────────

const allCapsRule = makeAllCapsRule(PREFIX, [
  { group: 'headline-1', label: 'Headline 1' },
  { group: 'headline-2', label: 'Headline 2' },
  { group: 'headline-3', label: 'Headline 3' },
]);

// ── Mechanical: banned phrases (!, superlatives) ────────────

const bannedPhrasesRule = makeBannedPhrasesRule(PREFIX, [
  { group: 'headline-1', label: 'Headline 1', checkExclamation: true },
  { group: 'headline-2', label: 'Headline 2', checkExclamation: true },
  { group: 'headline-3', label: 'Headline 3', checkExclamation: true },
  { group: 'description-1', label: 'Description 1', checkExclamation: false },
  { group: 'description-2', label: 'Description 2', checkExclamation: false },
]);

// ── Structural: duplicate detection ─────────────────────────

const duplicateHeadlinesRule = makeDuplicateRule(PREFIX, {
  groups: ['headline-1', 'headline-2', 'headline-3'],
  poolLabel: 'Headlines',
  threshold: 0.8,
  severity: 'fail',
});

const duplicateDescriptionsRule = makeDuplicateRule(PREFIX, {
  groups: ['description-1', 'description-2'],
  poolLabel: 'Descriptions',
  threshold: 0.8,
  severity: 'fail',
});

// ── Structural: sitelink-restating-title ────────────────────

const sitelinkRestatingTitleRule: Rule = (ctx: ValidatorContext): RuleResult[] => {
  const results: RuleResult[] = [];
  for (let n = 1; n <= 4; n++) {
    const title = (ctx.groups.get(`sitelink-${n}-title`) ?? '').toLowerCase().trim();
    const desc = (ctx.groups.get(`sitelink-${n}-description`) ?? '').toLowerCase().trim();
    if (!title || !desc) continue;
    // Description includes the title as substring? Or 70%+ token overlap?
    const overlap = desc.includes(title);
    if (overlap) {
      results.push({
        ruleId: `${PREFIX}.sitelink-restating-title.${n}`,
        category: 'structural',
        status: 'warn',
        message: `Sitelink ${n} description herhaalt de title — verspilde real estate.`,
        suggestion: `Description voegt unieke value toe (proof, benefit, urgency) — niet alleen de title herhaald.`,
        fieldGroup: `sitelink-${n}-description`,
      });
    }
  }
  return results;
};

// ── Structural: keyword-in-h1 / keyword-in-d1 ───────────────

const keywordInH1Rule: Rule = (ctx: ValidatorContext): RuleResult[] => {
  if (!ctx.primaryKeyword) return [];
  const h1 = (ctx.groups.get('headline-1') ?? '').toLowerCase();
  const kw = ctx.primaryKeyword.toLowerCase();
  if (h1.includes(kw)) {
    return [
      {
        ruleId: `${PREFIX}.keyword-in-h1`,
        category: 'structural',
        status: 'pass',
        message: `Primary keyword "${ctx.primaryKeyword}" in Headline 1 — Quality Score Ad Relevance boost.`,
        fieldGroup: 'headline-1',
      },
    ];
  }
  return [
    {
      ruleId: `${PREFIX}.keyword-in-h1`,
      category: 'structural',
      status: 'warn',
      message: `Primary keyword "${ctx.primaryKeyword}" niet in Headline 1 — Google Quality Score "Ad Relevance" lijdt eronder.`,
      suggestion: `Werk "${ctx.primaryKeyword}" natuurlijk in Headline 1.`,
      fieldGroup: 'headline-1',
    },
  ];
};

const keywordInD1Rule: Rule = (ctx: ValidatorContext): RuleResult[] => {
  if (!ctx.primaryKeyword) return [];
  const d1 = (ctx.groups.get('description-1') ?? '').toLowerCase();
  const kw = ctx.primaryKeyword.toLowerCase();
  if (d1.includes(kw)) {
    return [
      {
        ruleId: `${PREFIX}.keyword-in-d1`,
        category: 'structural',
        status: 'pass',
        message: `Primary keyword "${ctx.primaryKeyword}" in Description 1.`,
        fieldGroup: 'description-1',
      },
    ];
  }
  return [
    {
      ruleId: `${PREFIX}.keyword-in-d1`,
      category: 'structural',
      status: 'warn',
      message: `Primary keyword "${ctx.primaryKeyword}" niet in Description 1 — sterker QS-relevance signal als wel.`,
      suggestion: `Verwerk "${ctx.primaryKeyword}" in Description 1.`,
      fieldGroup: 'description-1',
    },
  ];
};

// ── Coverage rules ──────────────────────────────────────────

const coverageHeadlinesRule: Rule = (ctx: ValidatorContext): RuleResult[] => {
  const filled = ['headline-1', 'headline-2', 'headline-3'].filter(
    (g) => (ctx.groups.get(g) ?? '').trim().length > 0,
  ).length;
  if (filled >= 3) {
    return [
      {
        ruleId: `${PREFIX}.coverage.headlines`,
        category: 'coverage',
        status: 'pass',
        message: `${filled}/3 headlines gevuld — Google RSA-minimum gehaald.`,
      },
    ];
  }
  return [
    {
      ruleId: `${PREFIX}.coverage.headlines`,
      category: 'coverage',
      status: 'fail',
      message: `Slechts ${filled}/3 headlines gevuld. Google RSA vereist minimum 3.`,
      suggestion: `Vul Headline ${filled + 1} t/m 3 met distincte hook-angles.`,
    },
  ];
};

const coverageDescriptionsRule: Rule = (ctx: ValidatorContext): RuleResult[] => {
  const filled = ['description-1', 'description-2'].filter(
    (g) => (ctx.groups.get(g) ?? '').trim().length > 0,
  ).length;
  if (filled >= 2) {
    return [
      {
        ruleId: `${PREFIX}.coverage.descriptions`,
        category: 'coverage',
        status: 'pass',
        message: `${filled}/2 descriptions gevuld — Google RSA-minimum gehaald.`,
      },
    ];
  }
  return [
    {
      ruleId: `${PREFIX}.coverage.descriptions`,
      category: 'coverage',
      status: 'fail',
      message: `Slechts ${filled}/2 descriptions gevuld. Google RSA vereist minimum 2.`,
      suggestion: `Vul Description ${filled + 1} met secondary benefit + specifieke CTA.`,
    },
  ];
};

const coverageSitelinksRule: Rule = (ctx: ValidatorContext): RuleResult[] => {
  const completeCount = [1, 2, 3, 4].filter(
    (n) =>
      (ctx.groups.get(`sitelink-${n}-title`) ?? '').trim().length > 0 &&
      (ctx.groups.get(`sitelink-${n}-description`) ?? '').trim().length > 0,
  ).length;
  if (completeCount >= 4) {
    return [
      {
        ruleId: `${PREFIX}.coverage.sitelinks`,
        category: 'coverage',
        status: 'pass',
        message: `${completeCount}/4 sitelinks volledig (title + description) — boost Ad Strength.`,
      },
    ];
  }
  return [
    {
      ruleId: `${PREFIX}.coverage.sitelinks`,
      category: 'coverage',
      status: 'warn',
      message: `Slechts ${completeCount}/4 sitelinks volledig. Volle 4 boost Ad Strength signal.`,
      suggestion: `Vul ${4 - completeCount} sitelink${4 - completeCount === 1 ? '' : 's'} aan met title + description die unieke value toevoegt.`,
    },
  ];
};

// ── Export rules-array voor registry ────────────────────────

export const searchAdRules: Rule[] = [
  charOverflowRule,
  allCapsRule,
  bannedPhrasesRule,
  duplicateHeadlinesRule,
  duplicateDescriptionsRule,
  sitelinkRestatingTitleRule,
  keywordInH1Rule,
  keywordInD1Rule,
  coverageHeadlinesRule,
  coverageDescriptionsRule,
  coverageSitelinksRule,
];
