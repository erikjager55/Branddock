// =============================================================
// L1 rule-set — Meta (Facebook + Instagram) link-card ad
//
// Per spec sectie 4.5 placeholder. Mirror van A.5.1 search-ad
// pattern: hergebruikt shared factories voor mechanical checks.
//
// Mechanical: char-overflow (body ≤125, headline ≤40, description
// ≤30, cta-button ≤25), ALL CAPS warn, banned-phrases warn
//
// Structural: no-hashtags-in-body (Meta ads down-prioriteren
// hashtags), no-external-link-in-body (link-card handles link),
// cta-button-words ≤3 fail, description-redundant warn
//
// Coverage: body required, headline required, cta-button required,
// image required
//
// Aggregate-weights (spec sectie 6.2): L1=0.30, L2=0.70 — hook-stop-
// power is dominant signal voor feed-scrolling ads.
// =============================================================

import type { Rule, RuleResult, ValidatorContext } from '../../types';
import { makeCharOverflowRule } from '../shared/char-overflow';
import { makeAllCapsRule } from '../shared/all-caps';
import { makeBannedPhrasesRule } from '../shared/banned-phrases';

const PREFIX = 'facebook-ad';

// ── Mechanical: char-overflow per asset ─────────────────────

const charOverflowRule = makeCharOverflowRule(PREFIX, [
  { group: 'body', cap: 125, label: 'Body (primary text)' },
  { group: 'headline', cap: 40, label: 'Headline' },
  { group: 'description', cap: 30, label: 'Description' },
  { group: 'cta-button', cap: 25, label: 'CTA button' },
]);

// ── Mechanical: ALL CAPS check op headline + body ───────────

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

// ── Structural: no hashtags in body ─────────────────────────
// Meta ads don't reward hashtag use (unlike organic). Hashtags in
// body waste primary-text-fold real estate.

const noHashtagsInBodyRule: Rule = (ctx: ValidatorContext): RuleResult[] => {
  const body = ctx.groups.get('body') ?? '';
  if (body.trim().length === 0) return [];
  const hashtagCount = (body.match(/#\w+/g) ?? []).length;
  if (hashtagCount === 0) {
    return [
      {
        ruleId: `${PREFIX}.no-hashtags-in-body`,
        category: 'structural',
        status: 'pass',
        message: 'Body bevat geen hashtags.',
        fieldGroup: 'body',
      },
    ];
  }
  return [
    {
      ruleId: `${PREFIX}.no-hashtags-in-body`,
      category: 'structural',
      status: 'warn',
      message: `Body bevat ${hashtagCount} hashtag${hashtagCount === 1 ? '' : 's'} — Meta ads belonen geen hashtags (anders dan organic posts).`,
      suggestion: 'Verwijder hashtags uit body — verspilt primary-text real estate vóór de "See more" fold.',
      fieldGroup: 'body',
    },
  ];
};

// ── Structural: no external link in body ────────────────────
// Link-card handles the destination link; body links zijn meestal
// raw URLs of trackers die de feed-card breken.

const URL_PATTERN = /https?:\/\/\S+/i;

const noExternalLinkInBodyRule: Rule = (ctx: ValidatorContext): RuleResult[] => {
  const body = ctx.groups.get('body') ?? '';
  if (body.trim().length === 0) return [];
  if (URL_PATTERN.test(body)) {
    return [
      {
        ruleId: `${PREFIX}.no-external-link-in-body`,
        category: 'structural',
        status: 'warn',
        message: 'Body bevat raw URL — link-card handles destination, URLs in body zijn redundant en visually messy.',
        suggestion: 'Verwijder URL uit body, vertrouw op de link-card CTA.',
        fieldGroup: 'body',
      },
    ];
  }
  return [
    {
      ruleId: `${PREFIX}.no-external-link-in-body`,
      category: 'structural',
      status: 'pass',
      message: 'Body bevat geen raw URLs.',
      fieldGroup: 'body',
    },
  ];
};

// ── Structural: CTA button ≤3 words ─────────────────────────

const ctaButtonWordsRule: Rule = (ctx: ValidatorContext): RuleResult[] => {
  const cta = (ctx.groups.get('cta-button') ?? '').trim();
  if (cta.length === 0) return [];
  const words = cta.split(/\s+/).filter(Boolean).length;
  if (words <= 3) {
    return [
      {
        ruleId: `${PREFIX}.cta-button-concise`,
        category: 'structural',
        status: 'pass',
        message: `CTA button is ${words} word${words === 1 ? '' : 's'} — concise zoals Meta's presets ("Learn More", "Shop Now").`,
        fieldGroup: 'cta-button',
      },
    ];
  }
  return [
    {
      ruleId: `${PREFIX}.cta-button-concise`,
      category: 'structural',
      status: 'warn',
      message: `CTA button is ${words} woorden — Meta's preset CTAs zijn 1-3 woorden ("Learn More", "Shop Now", "Get Quote").`,
      suggestion: 'Verkort naar 1-3 woorden. Lange CTAs zien er amateuristisch uit op mobile.',
      fieldGroup: 'cta-button',
    },
  ];
};

// ── Structural: description redundant met headline ──────────

const descriptionRedundantRule: Rule = (ctx: ValidatorContext): RuleResult[] => {
  const headline = (ctx.groups.get('headline') ?? '').toLowerCase().trim();
  const description = (ctx.groups.get('description') ?? '').toLowerCase().trim();
  if (!headline || !description) {
    return [];
  }
  if (description.includes(headline) || headline.includes(description)) {
    return [
      {
        ruleId: `${PREFIX}.description-redundant`,
        category: 'structural',
        status: 'warn',
        message: 'Description herhaalt (deels) de headline — Meta toont vaak slechts één van beide, redundantie is verspilling.',
        suggestion: 'Maak description uniek (proof / urgency / 2e angle) of laat hem leeg.',
        fieldGroup: 'description',
      },
    ];
  }
  return [
    {
      ruleId: `${PREFIX}.description-redundant`,
      category: 'structural',
      status: 'pass',
      message: 'Description voegt unieke info toe.',
      fieldGroup: 'description',
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
        message: `${label} ontbreekt — vereist door Meta link-card ad format.`,
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
        message: 'Hero image (1.91:1) toegevoegd.',
      },
    ];
  }
  return [
    {
      ruleId: `${PREFIX}.coverage.image`,
      category: 'coverage',
      status: 'fail',
      message: 'Hero image ontbreekt — Meta link-card vereist 1.91:1 image (1200×628 aanbevolen).',
    },
  ];
};

// ── Export rules-array voor registry ────────────────────────

export const facebookAdRules: Rule[] = [
  charOverflowRule,
  allCapsRule,
  bannedPhrasesRule,
  noHashtagsInBodyRule,
  noExternalLinkInBodyRule,
  ctaButtonWordsRule,
  descriptionRedundantRule,
  coverageBodyRule,
  coverageHeadlineRule,
  coverageCtaButtonRule,
  coverageImageRule,
];
