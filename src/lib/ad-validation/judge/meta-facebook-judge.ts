// =============================================================
// L2 AI-Judge — meta/facebook-ad (link-card ad on Facebook + Instagram)
//
// 3 dimensions per spec sectie 5.2:
//   - hook-stop-power: hoe stopt de body's first-75-chars de scroll?
//     (Meta truncates body bij ~75 chars met "See more" fold)
//   - body-cta-alignment: matched de body emotionally / logically de
//     cta-button + headline + description?
//   - image-text-synergy: complementeert de image-direction prose de
//     body's claim of duplicateert het?
// =============================================================

import type { AdJudge, L2JudgeSuccess, ValidatorContext } from '../types';

const DIMENSIONS = ['hook-stop-power', 'body-cta-alignment', 'image-text-synergy'] as const;

type Dim = (typeof DIMENSIONS)[number];

function hasMinimalBrandContext(brand: { brandName?: string }): boolean {
  return !!(brand && brand.brandName && brand.brandName.trim().length > 0);
}

export const metaFacebookAdJudge: AdJudge = {
  buildPrompt(ctx: ValidatorContext): string {
    const brand = ctx.brandContext;
    const brandBlock = hasMinimalBrandContext(brand)
      ? `## Brand context\nBrand: ${brand.brandName}${brand.voiceBaseline1Pager ? '\nVoice baseline:\n' + brand.voiceBaseline1Pager.slice(0, 600) : ''}\n`
      : '';

    const body = ctx.groups.get('body') ?? '(empty)';
    const bodyFirst75 = body.slice(0, 75);
    const headline = ctx.groups.get('headline') ?? '(empty)';
    const description = ctx.groups.get('description') ?? '(empty)';
    const cta = ctx.groups.get('cta-button') ?? '(empty)';
    const imageDirection = ctx.imageDirection ?? '(empty — visual pipeline produces hero)';

    return [
      'You are a senior Meta advertising creative director with 10+ years auditing Facebook/Instagram link-card ads against Quality Ranking + Engagement Rate Ranking + Conversion Rate Ranking signals.',
      '',
      brandBlock,
      '## Ad to judge',
      '',
      `Body (primary text, full): ${body}`,
      `Body before "See more" fold (~75 chars): ${bodyFirst75}`,
      '',
      `Headline (link-card): ${headline}`,
      `Description (link-card sub): ${description}`,
      `CTA button: ${cta}`,
      '',
      `Image direction: ${imageDirection}`,
      '',
      '## Dimensions to score (0-100 each)',
      '',
      `1. **hook-stop-power**: De first-75-chars van body zijn alles wat een mobiele Meta-gebruiker ziet voordat "See more" hem afsnijdt. Score op hoe scroll-stoppend die opening is — pattern interrupt, concrete pain-point, surprising stat, of contrarian claim. Score lager als opening = brand-intro of generic "Did you know..."`,
      `2. **body-cta-alignment**: Maakt de body een belofte die de cta-button vervult? Bv. body "Plan een afspraak..." + CTA "Plan adviesgesprek" = aligned. Body over product feature + CTA "Shop Now" zonder logical bridge = mis-aligned. Score op de coherentie van body → headline → description → cta.`,
      `3. **image-text-synergy**: Complementeert de image-direction de body's claim, of dupliceert het? Bv. body claims "naadloos verzonken" + image-direction "naadloos vloerluik in interior" = duplication (image herhaalt wat body al zegt). Body claims "naadloos" + image-direction "kraan opening luik in moderne keuken" = synergy (image toont scenario, body de claim). Score lager bij duplication.`,
      '',
      '## Output schema (JSON ONLY, no markdown fences)',
      '',
      '{',
      '  "dimensions": {',
      '    "hook-stop-power": { "score": <0-100>, "rationale": "1-sentence why", "suggestion": "optional 1-sentence improvement" },',
      '    "body-cta-alignment": { "score": <0-100>, "rationale": "...", "suggestion": "..." },',
      '    "image-text-synergy": { "score": <0-100>, "rationale": "...", "suggestion": "..." }',
      '  },',
      '  "summary": "1-2 sentence overall verdict"',
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

export const META_FACEBOOK_DIMENSIONS: readonly Dim[] = DIMENSIONS;
