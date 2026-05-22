// =============================================================
// L2 AI-Judge — Meta retargeting ad (3 scenarios)
//
// Retargeting kwaliteit wordt primair bepaald door of de copy
// het emotional state matcht van de specifieke audience-scenario.
// Generic ad-judge dimensions (hook-strength, CTA-clarity) zijn
// hier minder relevant — een retargeting-ad faalt of slaagt
// op SCENARIO-FIT, niet op klassieke ad-mechanica.
//
// 4 dimensions:
//   - scenario-emotional-fit: matcht de tone het emotional state
//     van elk scenario? (cart=defensive, visitor=curious-not-convinced,
//     past-customer=already-trusts)
//   - friction-removal-precision (cart-abandoner): adresseert het
//     SPECIFIEK een friction (prijs / shipping / trust / payment)?
//   - new-angle-quality (page-visitor): brengt het een NIEUWE
//     angle die niet op de product-page stond?
//   - past-customer-novelty: levert het ECHTE novelty (nieuwe
//     feature / cross-sell / VIP-access), niet recycle?
// =============================================================

import type { AdJudge, L2JudgeSuccess, ValidatorContext } from '../types';

const DIMENSIONS = [
  'scenario-emotional-fit',
  'friction-removal-precision',
  'new-angle-quality',
  'past-customer-novelty',
] as const;

type Dim = (typeof DIMENSIONS)[number];

function hasMinimalBrandContext(brand: { brandName?: string }): boolean {
  return !!(brand && brand.brandName && brand.brandName.trim().length > 0);
}

function renderScenario(
  ctx: ValidatorContext,
  prefix: 'cart-abandoner' | 'page-visitor' | 'past-customer',
): string {
  return [
    `Primary text: ${ctx.groups.get(`${prefix}-primary-text`) ?? '(empty)'}`,
    `Headline: ${ctx.groups.get(`${prefix}-headline`) ?? '(empty)'}`,
    `CTA: ${ctx.groups.get(`${prefix}-cta`) ?? '(empty)'}`,
    `Creative direction: ${ctx.groups.get(`${prefix}-creative-direction`) ?? '(empty)'}`,
    `Offer strategy: ${ctx.groups.get(`${prefix}-offer-strategy`) ?? '(empty)'}`,
    `Frequency cap: ${ctx.groups.get(`${prefix}-frequency-cap`) ?? '(empty)'}`,
  ].join('\n');
}

export const retargetingAdJudge: AdJudge = {
  buildPrompt(ctx: ValidatorContext): string {
    const brand = ctx.brandContext;
    const brandBlock = hasMinimalBrandContext(brand)
      ? `## Brand context\nBrand: ${brand.brandName}${brand.voiceBaseline1Pager ? '\nVoice baseline:\n' + brand.voiceBaseline1Pager.slice(0, 600) : ''}\n`
      : '';

    return [
      'You are a senior Meta retargeting strategist (8+ years scaling DTC + SaaS retargeting campaigns). You can spot in 10 seconds when retargeting copy treats all audiences as one funnel-stage — the #1 mistake that burns budget. You enforce: cart-abandoner copy ≠ page-visitor copy ≠ past-customer copy. Different emotional states require different messaging.',
      '',
      brandBlock,
      '## Retargeting ad — 3 audience scenarios',
      '',
      '### Scenario 1: cart-abandoner (felt desire, hit friction — defensive emotional state)',
      renderScenario(ctx, 'cart-abandoner'),
      '',
      '### Scenario 2: page-visitor (curious but not convinced — needs new angle / proof)',
      renderScenario(ctx, 'page-visitor'),
      '',
      '### Scenario 3: past-customer (already trusts — needs novelty, not original pitch)',
      renderScenario(ctx, 'past-customer'),
      '',
      '## Dimensions to score (0-100 each)',
      '',
      `1. **scenario-emotional-fit**: Matcht de tone PER scenario het emotional state? Cart-abandoner moet kalm-objection-removal voelen (NIET aggressive urgency). Page-visitor moet curiosity-igniting / new-frame voelen. Past-customer moet warm-insider voelen. Score hoog als alle 3 scenarios verschillende emotionele registers raken. Score laag als ze allemaal hetzelfde voelen of als één scenario het verkeerde register heeft (bv cart-abandoner met "LAST CHANCE").`,
      '',
      `2. **friction-removal-precision** (cart-abandoner-specific): Adresseert de cart-abandoner copy een SPECIFIEKE friction-hypothese? Score hoog voor concrete friction-removal (free shipping, return-policy, payment-method, security-badge, trust-signal). Score laag als het generieke "Don't miss out" of "Come back" is — dat is geen friction-adres, dat is herhaling van originele pitch.`,
      '',
      `3. **new-angle-quality** (page-visitor-specific): Brengt de page-visitor copy een angle die NIET op de product-page stond? Score hoog voor: social proof (customer-quote, review-stat), use-case-vergelijking (andere persona / scenario), comparison-frame, FOMO-zonder-aggressie, niet-eerder-getoonde feature-benefit. Score laag voor: herhaling van product-features die op de page stonden, generieke value-prop herhaling, identieke framing als cart-abandoner.`,
      '',
      `4. **past-customer-novelty**: Levert de past-customer copy ECHTE novelty? Score hoog voor: nieuwe feature-launch, cross-sell van product ze nog NIET hebben, early-access/VIP-frame, referral-reward, customer-only content. Score laag voor: discount-language (verspilling van marge op trusted audience), herhaling van origineel product, "Buy again"-frames (impliceert dat past-customer behandeld wordt als prospect).`,
      '',
      '## Output schema (JSON ONLY, no markdown fences)',
      '',
      '{',
      '  "dimensions": {',
      '    "scenario-emotional-fit": { "score": <0-100>, "rationale": "1-sentence why", "suggestion": "optional 1-sentence improvement per problematic scenario" },',
      '    "friction-removal-precision": { "score": <0-100>, "rationale": "...", "suggestion": "..." },',
      '    "new-angle-quality": { "score": <0-100>, "rationale": "...", "suggestion": "..." },',
      '    "past-customer-novelty": { "score": <0-100>, "rationale": "...", "suggestion": "..." }',
      '  },',
      '  "summary": "1-2 sentence overall verdict highlighting weakest scenario"',
      '}',
    ].join('\n');
  },

  parseResponse(raw: string): L2JudgeSuccess {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new Error(`Judge response is not valid JSON: ${(err as Error).message}. Raw: ${raw.slice(0, 200)}`);
    }
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Judge response is not a JSON object');
    }
    const obj = parsed as Record<string, unknown>;
    const dimsRaw = obj.dimensions;
    if (!dimsRaw || typeof dimsRaw !== 'object') {
      throw new Error('Judge response missing "dimensions" object');
    }
    const dimensions: L2JudgeSuccess['dimensions'] = {};
    for (const dim of DIMENSIONS) {
      const d = (dimsRaw as Record<string, unknown>)[dim];
      if (!d || typeof d !== 'object') {
        throw new Error(`Judge response missing dimension "${dim}"`);
      }
      const dObj = d as Record<string, unknown>;
      const score = typeof dObj.score === 'number' ? dObj.score : Number(dObj.score);
      if (Number.isNaN(score) || score < 0 || score > 100) {
        throw new Error(`Judge dimension "${dim}" has invalid score: ${dObj.score}`);
      }
      dimensions[dim] = {
        score: Math.round(score),
        rationale: typeof dObj.rationale === 'string' ? dObj.rationale : '',
        suggestion:
          typeof dObj.suggestion === 'string' && dObj.suggestion.length > 0
            ? dObj.suggestion
            : undefined,
      };
    }
    const summary = typeof obj.summary === 'string' ? obj.summary : '';
    return { dimensions, summary };
  },
};

export const RETARGETING_AD_DIMENSIONS: readonly Dim[] = DIMENSIONS;
