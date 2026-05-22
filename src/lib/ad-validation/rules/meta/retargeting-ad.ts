// =============================================================
// L1 rule-set — Meta retargeting ad (3 audience scenarios)
//
// Retargeting heeft 18 named groups: 3 scenarios × 6 fields
// (primary-text / headline / cta / creative-direction /
// offer-strategy / frequency-cap), plus 1 image.
//
// Scenarios:
//   - cart-abandoner  → felt desire, hit friction (objection-removal)
//   - page-visitor    → curious, not convinced (new angle / proof)
//   - past-customer   → trusted before (novelty / expansion, never repeat)
//
// Critical rules afgeleid uit seed bestPractices:
//   1. char-overflow per veld (300/40/20/250/200/150)
//   2. No aggressive urgency met cart-abandoners ("LAST CHANCE",
//      "FINAL HOURS", "ENDING SOON" → warn breekt defensive trigger)
//   3. Past-customer mag GEEN discount-language hebben (warn)
//   4. Page-visitor mag GEEN herhaling van waarschijnlijke
//      original value-prop (heuristisch: shared substring met andere
//      scenarios → warn op page-visitor)
//   5. Coverage: alle 18 fields verplicht (fail per scenario als
//      een veld ontbreekt; image required)
//
// Aggregate-weights: L1=0.35, L2=0.65 — scenario-emotional-fit en
// novelty/objection-removal zijn primair semantische judgements.
// =============================================================

import type { Rule, RuleResult, ValidatorContext } from '../../types';
import { makeCharOverflowRule } from '../shared/char-overflow';
import { makeAllCapsRule } from '../shared/all-caps';

const PREFIX = 'retargeting-ad';

const SCENARIOS = ['cart-abandoner', 'page-visitor', 'past-customer'] as const;
type Scenario = (typeof SCENARIOS)[number];

const FIELDS = [
  { suffix: 'primary-text', cap: 300, label: 'Primary text' },
  { suffix: 'headline', cap: 40, label: 'Headline' },
  { suffix: 'cta', cap: 20, label: 'CTA' },
  { suffix: 'creative-direction', cap: 250, label: 'Creative direction' },
  { suffix: 'offer-strategy', cap: 200, label: 'Offer strategy' },
  { suffix: 'frequency-cap', cap: 150, label: 'Frequency cap' },
] as const;

// ── Mechanical: char-overflow over alle 18 groups ───────────

const charOverflowRule = makeCharOverflowRule(
  PREFIX,
  SCENARIOS.flatMap((scen) =>
    FIELDS.map((f) => ({
      group: `${scen}-${f.suffix}`,
      cap: f.cap,
      label: `${scen} → ${f.label}`,
    })),
  ),
);

// ── Mechanical: ALL CAPS over copy-fields (primary-text +
// headline + cta). Creative-direction / offer-strategy /
// frequency-cap zijn instruction-fields, niet user-visible copy,
// dus geen ALL-CAPS check daar.

const allCapsRule = makeAllCapsRule(
  PREFIX,
  SCENARIOS.flatMap((scen) => [
    { group: `${scen}-primary-text`, label: `${scen} primary text` },
    { group: `${scen}-headline`, label: `${scen} headline` },
    { group: `${scen}-cta`, label: `${scen} CTA` },
  ]),
);

// ── Structural: aggressive-urgency op cart-abandoner ───────
// Seed bestPractice: NEVER use aggressive urgency met cart abandoners.

const AGGRESSIVE_URGENCY_PATTERNS = [
  /\blast chance\b/i,
  /\bfinal hour(s)?\b/i,
  /\bending soon\b/i,
  /\bact now\b/i,
  /\bhurry\b/i,
  /\bdon'?t miss out\b/i,
  /\bonly \d+ left\b/i,
  /\bgone (forever|today)\b/i,
];

const noAggressiveUrgencyCartAbandonerRule: Rule = (ctx: ValidatorContext): RuleResult[] => {
  const targets = ['cart-abandoner-primary-text', 'cart-abandoner-headline', 'cart-abandoner-cta'];
  const text = targets.map((g) => ctx.groups.get(g) ?? '').join(' ');
  const hits = AGGRESSIVE_URGENCY_PATTERNS.filter((p) => p.test(text));
  if (hits.length === 0) {
    return [
      {
        ruleId: `${PREFIX}.cart-abandoner.no-aggressive-urgency`,
        category: 'structural',
        status: 'pass',
        message: 'Cart-abandoner copy heeft geen aggressive urgency — past bij defensive emotional state.',
      },
    ];
  }
  return [
    {
      ruleId: `${PREFIX}.cart-abandoner.no-aggressive-urgency`,
      category: 'structural',
      status: 'warn',
      message: `Cart-abandoner copy bevat ${hits.length} aggressive-urgency patroon${hits.length === 1 ? '' : 'en'} ("LAST CHANCE"-style). Cart-leavers zijn defensive — druk maakt ze juist anti-convert.`,
      suggestion: 'Swap urgency naar objection-removal: "Free shipping included", "30-day return policy", "Save your cart for later". Adres de SPECIFIEKE friction-hypothese (prijs / shipping / trust / distraction).',
    },
  ];
};

// ── Structural: no-discount-language op past-customer ──────
// Seed bestPractice: hottest audience gets lightest incentive;
// past customers don't need a discount.

const DISCOUNT_PATTERNS = [
  /\b\d{1,3}%\s*(off|discount|korting)\b/i,
  /\bsave\s*\$?\d+/i,
  /\b(half|50%)\s*off\b/i,
  /\bdiscount(ed)?\b/i,
  /\bsale\b/i,
  /\bclearance\b/i,
  /\bpromo(tion)?\s*code\b/i,
  /\b(use|enter)\s*code\b/i,
];

const noDiscountPastCustomerRule: Rule = (ctx: ValidatorContext): RuleResult[] => {
  const targets = ['past-customer-primary-text', 'past-customer-headline', 'past-customer-offer-strategy'];
  const text = targets.map((g) => ctx.groups.get(g) ?? '').join(' ');
  const hits = DISCOUNT_PATTERNS.filter((p) => p.test(text));
  if (hits.length === 0) {
    return [
      {
        ruleId: `${PREFIX}.past-customer.no-discount`,
        category: 'structural',
        status: 'pass',
        message: 'Past-customer copy focust op novelty/loyalty zonder discount — correct voor hottest audience.',
      },
    ];
  }
  return [
    {
      ruleId: `${PREFIX}.past-customer.no-discount`,
      category: 'structural',
      status: 'warn',
      message: `Past-customer copy bevat discount-language (${hits.length} match${hits.length === 1 ? '' : 'es'}) — verspilling van marge. Past-customers trust je al; geef ze novelty, niet korting.`,
      suggestion: 'Swap discount naar: nieuwe feature, early-access, VIP-treatment, referral-reward, of cross-sell van iets dat ze nog NIET gekocht hebben.',
    },
  ];
};

// ── Structural: past-customer mag niet hetzelfde product
// suggereren als wat de cart-abandoner / page-visitor scenario
// shows. Heuristic: significant shared n-grams tussen
// past-customer-primary-text en cart-abandoner-primary-text
// duidt op "promoting same thing again" (anti-pattern).

function jaccardSimilarity(a: string, b: string): number {
  const tokenize = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length > 2),
    );
  const sa = tokenize(a);
  const sb = tokenize(b);
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
}

const pastCustomerNoveltyRule: Rule = (ctx: ValidatorContext): RuleResult[] => {
  const pastCustomer = ctx.groups.get('past-customer-primary-text') ?? '';
  const cartAbandoner = ctx.groups.get('cart-abandoner-primary-text') ?? '';
  const pageVisitor = ctx.groups.get('page-visitor-primary-text') ?? '';
  if (!pastCustomer.trim()) return [];
  const simCart = jaccardSimilarity(pastCustomer, cartAbandoner);
  const simVisitor = jaccardSimilarity(pastCustomer, pageVisitor);
  const maxSim = Math.max(simCart, simVisitor);
  if (maxSim < 0.5) {
    return [
      {
        ruleId: `${PREFIX}.past-customer.novelty`,
        category: 'structural',
        status: 'pass',
        message: 'Past-customer copy is novel — verschilt voldoende van cart-abandoner / page-visitor framing.',
      },
    ];
  }
  if (maxSim < 0.7) {
    return [
      {
        ruleId: `${PREFIX}.past-customer.novelty`,
        category: 'structural',
        status: 'warn',
        message: `Past-customer copy heeft ${(maxSim * 100).toFixed(0)}% overlap met cold-audience copy — riskeert "same offer again" gevoel.`,
        suggestion: 'Past-customers verwachten NIEUWE waarde. Vermeld feature-launch, customer-only access, of cross-sell van iets ze nog niet hebben.',
      },
    ];
  }
  return [
    {
      ruleId: `${PREFIX}.past-customer.novelty`,
      category: 'structural',
      status: 'fail',
      message: `Past-customer copy is ${(maxSim * 100).toFixed(0)}% overlappend met cold-audience copy — leest als generieke herhaling. Past-customer scenario heeft NOVELTY nodig, geen recycle.`,
      suggestion: 'Volledig herschrijven: focus op feature-update / cross-sell / VIP-treatment / referral. Geen recycle van cold-audience messaging.',
    },
  ];
};

// ── Structural: cart-abandoner moet friction adresseren ───
// Heuristic: cart-abandoner-offer-strategy bevat één van
// {shipping, return, trust, security, guarantee, payment, support}
// → adresseert concrete friction; anders warn.

const FRICTION_KEYWORDS = [
  /\bshipping\b/i,
  /\breturn(s)?\b/i,
  /\btrust\b/i,
  /\bsecur(e|ity)\b/i,
  /\bguarantee\b/i,
  /\bpayment\b/i,
  /\bsupport\b/i,
  /\brefund\b/i,
  /\bfree(\s+\w+){0,2}\s+(shipping|return)/i,
  /\bmoney[-\s]?back\b/i,
];

const cartAbandonerFrictionRule: Rule = (ctx: ValidatorContext): RuleResult[] => {
  const offerStrategy = ctx.groups.get('cart-abandoner-offer-strategy') ?? '';
  const primary = ctx.groups.get('cart-abandoner-primary-text') ?? '';
  if (!offerStrategy.trim() && !primary.trim()) return [];
  const combined = offerStrategy + ' ' + primary;
  const matched = FRICTION_KEYWORDS.some((p) => p.test(combined));
  if (matched) {
    return [
      {
        ruleId: `${PREFIX}.cart-abandoner.addresses-friction`,
        category: 'structural',
        status: 'pass',
        message: 'Cart-abandoner copy adresseert concrete friction (shipping / return / trust / payment).',
      },
    ];
  }
  return [
    {
      ruleId: `${PREFIX}.cart-abandoner.addresses-friction`,
      category: 'structural',
      status: 'warn',
      message: 'Cart-abandoner copy adresseert geen herkenbare friction-categorie. Cart-leavers verlieten om EEN reden — herhaling van originele waarde-prop overtuigt niet.',
      suggestion: 'Kies één friction-hypothese: prijs / shipping / trust / payment-method / distraction. Adresseer die expliciet in offer-strategy + primary-text.',
    },
  ];
};

// ── Structural: page-visitor moet new angle hebben (niet de
// generieke product-pitch herhalen). Heuristic: page-visitor
// copy mag niet ≥70% overlap hebben met cart-abandoner copy
// (cart-abandoner is closest naar original product-page).

const pageVisitorNewAngleRule: Rule = (ctx: ValidatorContext): RuleResult[] => {
  const visitor = ctx.groups.get('page-visitor-primary-text') ?? '';
  const cart = ctx.groups.get('cart-abandoner-primary-text') ?? '';
  if (!visitor.trim() || !cart.trim()) return [];
  const sim = jaccardSimilarity(visitor, cart);
  if (sim < 0.6) {
    return [
      {
        ruleId: `${PREFIX}.page-visitor.new-angle`,
        category: 'structural',
        status: 'pass',
        message: 'Page-visitor copy heeft eigen angle — verschilt voldoende van cart-abandoner framing.',
      },
    ];
  }
  if (sim < 0.8) {
    return [
      {
        ruleId: `${PREFIX}.page-visitor.new-angle`,
        category: 'structural',
        status: 'warn',
        message: `Page-visitor copy heeft ${(sim * 100).toFixed(0)}% overlap met cart-abandoner — page-visitors zagen al de product-pagina, ze hebben een NIEUWE angle nodig.`,
        suggestion: 'Page-visitor copy moet iets brengen wat NIET op de oorspronkelijke pagina stond: social proof, use-case van een andere persona, FOMO, comparison.',
    },
    ];
  }
  return [
    {
      ruleId: `${PREFIX}.page-visitor.new-angle`,
      category: 'structural',
      status: 'fail',
      message: `Page-visitor copy is ${(sim * 100).toFixed(0)}% overlappend met cart-abandoner copy — feitelijk dezelfde boodschap. Page-visitors klikten al door product zonder cart-add: herhalen overtuigt niet.`,
      suggestion: 'Volledig herschrijven met nieuw frame: social proof / customer-quote / use-case-vergelijking / objection-removal die NIET op de visited page stond.',
    },
  ];
};

// ── Coverage rules: alle 18 fields per scenario ────────────

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
        message: `${label} ontbreekt — vereist voor scenario.`,
        fieldGroup: group,
      },
    ];
  };
}

const coverageRules: Rule[] = SCENARIOS.flatMap((scen) =>
  FIELDS.map((f) => makeCoverageRule(`${scen}-${f.suffix}`, `${scen} → ${f.label}`)),
);

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
      message: 'Hero image ontbreekt — vereist voor retargeting ad.',
    },
  ];
};

// ── Export rules-array voor registry ────────────────────────

export const retargetingAdRules: Rule[] = [
  charOverflowRule,
  allCapsRule,
  noAggressiveUrgencyCartAbandonerRule,
  noDiscountPastCustomerRule,
  pastCustomerNoveltyRule,
  cartAbandonerFrictionRule,
  pageVisitorNewAngleRule,
  ...coverageRules,
  coverageImageRule,
];
