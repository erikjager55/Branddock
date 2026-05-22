// =============================================================
// L1 rule-set — Native ad / sponsored article (publisher-side
// editorial content)
//
// Anders dan andere ad-types: native-ad volgt journalism rules,
// niet advertising rules. De L1 checks enforce:
//   - Disclosure tag aanwezig (FTC/ASA legally required)
//   - Headline werkt standalone (geen brand mention)
//   - Opening paragraph delivers pure editorial value (geen brand)
//   - Brand mention max 2x in totaal (BuzzFeed Principle)
//   - Brand emerges ≥paragraph 3 (in body/brand-integration only)
//   - Closing is takeaway/reflection, niet sales-pitch
//   - char-overflow per asset-type
//
// Aggregate-weights: L1=0.40, L2=0.60 — editorial naturalness is
// een semantic judgement (L2-dominant) maar structural checks
// (disclosure, brand-position) zijn hard.
// =============================================================

import type { Rule, RuleResult, ValidatorContext } from '../../types';
import { makeCharOverflowRule } from '../shared/char-overflow';

const PREFIX = 'native-ad';

// ── Mechanical: char-overflow per asset-type ────────────────

const charOverflowRule = makeCharOverflowRule(PREFIX, [
  { group: 'headline', cap: 90, label: 'Headline' },
  { group: 'subheadline', cap: 140, label: 'Subheadline' },
  { group: 'opening-paragraph', cap: 500, label: 'Opening paragraph' },
  { group: 'body', cap: 2500, label: 'Body' },
  { group: 'brand-integration', cap: 600, label: 'Brand integration' },
  { group: 'closing', cap: 300, label: 'Closing' },
  { group: 'disclosure-position', cap: 120, label: 'Disclosure position note' },
]);

// ── Structural: brand mention rules ─────────────────────────
// Brand should NOT appear in headline of opening-paragraph.
// Total brand mentions across body + brand-integration ≤2.

function findBrandMentions(text: string, brandName: string): number {
  if (!brandName) return 0;
  // Word-boundary case-insensitive match
  const escaped = brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

const noBrandInHeadlineRule: Rule = (ctx: ValidatorContext): RuleResult[] => {
  const brand = ctx.brandContext.brandName;
  const headline = ctx.groups.get('headline') ?? '';
  if (!brand || !headline) return [];
  const count = findBrandMentions(headline, brand);
  if (count === 0) {
    return [
      {
        ruleId: `${PREFIX}.no-brand-in-headline`,
        category: 'structural',
        status: 'pass',
        message: 'Headline werkt standalone — geen brand mention. Klikt op nieuwsgierigheid / value.',
        fieldGroup: 'headline',
      },
    ];
  }
  return [
    {
      ruleId: `${PREFIX}.no-brand-in-headline`,
      category: 'structural',
      status: 'fail',
      message: `Headline noemt "${brand}" — editorial pattern verbiedt brand in headline. Headline klikt op curiosity/value alleen.`,
      suggestion: 'Herschrijf headline zonder brand. Brand mag pas vanaf paragraph 3 (in body / brand-integration).',
      fieldGroup: 'headline',
    },
  ];
};

const noBrandInOpeningParagraphRule: Rule = (ctx: ValidatorContext): RuleResult[] => {
  const brand = ctx.brandContext.brandName;
  const opening = ctx.groups.get('opening-paragraph') ?? '';
  if (!brand || !opening) return [];
  const count = findBrandMentions(opening, brand);
  if (count === 0) {
    return [
      {
        ruleId: `${PREFIX}.no-brand-in-opening`,
        category: 'structural',
        status: 'pass',
        message: 'Opening paragraph levert pure editorial value zonder brand mention.',
        fieldGroup: 'opening-paragraph',
      },
    ];
  }
  return [
    {
      ruleId: `${PREFIX}.no-brand-in-opening`,
      category: 'structural',
      status: 'fail',
      message: `Opening paragraph noemt "${brand}" ${count}x — kill de editorial illusion direct. Lezers bouncen binnen 3 seconden.`,
      suggestion: 'Verwijder brand uit opening-paragraph. Eerste paragraaf = scenario / stat / observation, ZONDER brand of product mention.',
      fieldGroup: 'opening-paragraph',
    },
  ];
};

const brandMentionMaxRule: Rule = (ctx: ValidatorContext): RuleResult[] => {
  const brand = ctx.brandContext.brandName;
  if (!brand) return [];
  const body = ctx.groups.get('body') ?? '';
  const brandIntegration = ctx.groups.get('brand-integration') ?? '';
  const closing = ctx.groups.get('closing') ?? '';
  const totalMentions =
    findBrandMentions(body, brand) +
    findBrandMentions(brandIntegration, brand) +
    findBrandMentions(closing, brand);
  if (totalMentions === 0) {
    return [
      {
        ruleId: `${PREFIX}.brand-mention-count`,
        category: 'structural',
        status: 'warn',
        message: `"${brand}" wordt 0x genoemd in body+brand-integration+closing — natural integration nodig in brand-integration paragraph.`,
        suggestion: 'Werk brand 1-2x natuurlijk in body of brand-integration ("One platform addressing this..."). Geen mention = sponsored content zonder doel.',
      },
    ];
  }
  if (totalMentions <= 2) {
    return [
      {
        ruleId: `${PREFIX}.brand-mention-count`,
        category: 'structural',
        status: 'pass',
        message: `"${brand}" wordt ${totalMentions}x genoemd — binnen BuzzFeed Principle (≤2 mentions).`,
      },
    ];
  }
  return [
    {
      ruleId: `${PREFIX}.brand-mention-count`,
      category: 'structural',
      status: 'fail',
      message: `"${brand}" wordt ${totalMentions}x genoemd — overschrijdt BuzzFeed Principle (max 2). Leest als press release, niet artikel.`,
      suggestion: `Reduceer naar maximaal 2 mentions. Eén in brand-integration paragraph is ideaal, plus optioneel één in body of closing.`,
    },
  ];
};

// ── Structural: closing-not-sales-pitch ─────────────────────

const SALES_PITCH_PATTERNS = [
  /\bbuy now\b/i, /\bsign up\b/i, /\bget started\b/i, /\bbook (a |your )?(demo|call)\b/i,
  /\bclaim (your )?offer\b/i, /\blimited time\b/i, /\blast chance\b/i,
  /\border now\b/i, /\bsubscribe (now|today)\b/i, /\bshop now\b/i,
];

const closingNotSalesRule: Rule = (ctx: ValidatorContext): RuleResult[] => {
  const closing = ctx.groups.get('closing') ?? '';
  if (!closing.trim()) return [];
  const matches = SALES_PITCH_PATTERNS.filter((p) => p.test(closing));
  if (matches.length === 0) {
    return [
      {
        ruleId: `${PREFIX}.closing-not-sales`,
        category: 'structural',
        status: 'pass',
        message: 'Closing is thought-provoking takeaway / forward-looking statement, geen sales pitch.',
        fieldGroup: 'closing',
      },
    ];
  }
  return [
    {
      ruleId: `${PREFIX}.closing-not-sales`,
      category: 'structural',
      status: 'warn',
      message: `Closing bevat sales-pitch patroon (${matches.length} match${matches.length === 1 ? '' : 'es'}) — breekt editorial frame.`,
      suggestion: 'Native ad closing = takeaway, reflection, of forward-looking statement. Geen "Buy now", "Sign up", "Book a demo". Als CTA nodig: natural recommendation ("For more on this topic, [Brand] offers...").',
      fieldGroup: 'closing',
    },
  ];
};

// ── Coverage rules ──────────────────────────────────────────

function makeCoverageRule(group: string, label: string, required = true): Rule {
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
        status: required ? 'fail' : 'warn',
        message: `${label} ontbreekt${required ? ' — vereist voor native ad format' : ''}.`,
        fieldGroup: group,
      },
    ];
  };
}

const coverageHeadlineRule = makeCoverageRule('headline', 'Headline');
const coverageOpeningRule = makeCoverageRule('opening-paragraph', 'Opening paragraph');
const coverageBodyRule = makeCoverageRule('body', 'Body');
const coverageBrandIntegrationRule = makeCoverageRule('brand-integration', 'Brand integration paragraph');
const coverageClosingRule = makeCoverageRule('closing', 'Closing');
const coverageDisclosureRule = makeCoverageRule('disclosure-position', 'Disclosure position note');
const coverageSubheadlineRule = makeCoverageRule('subheadline', 'Subheadline', false);

const coverageImageRule: Rule = (ctx: ValidatorContext): RuleResult[] => {
  if (ctx.hasImage) {
    return [
      {
        ruleId: `${PREFIX}.coverage.image`,
        category: 'coverage',
        status: 'pass',
        message: 'Hero image (16:9 editorial-style) toegevoegd.',
      },
    ];
  }
  return [
    {
      ruleId: `${PREFIX}.coverage.image`,
      category: 'coverage',
      status: 'fail',
      message: 'Hero image ontbreekt — vereist voor publisher-style native ad.',
    },
  ];
};

// ── Export rules-array voor registry ────────────────────────

export const nativeAdRules: Rule[] = [
  charOverflowRule,
  noBrandInHeadlineRule,
  noBrandInOpeningParagraphRule,
  brandMentionMaxRule,
  closingNotSalesRule,
  coverageHeadlineRule,
  coverageSubheadlineRule,
  coverageOpeningRule,
  coverageBodyRule,
  coverageBrandIntegrationRule,
  coverageClosingRule,
  coverageDisclosureRule,
  coverageImageRule,
];
