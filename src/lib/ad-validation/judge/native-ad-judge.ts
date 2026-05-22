// =============================================================
// L2 AI-Judge — native/sponsored-article (publisher-side editorial)
//
// 4 dimensions die editorial naturalness meten (anders dan
// klassieke ad-judge dimensions):
//   - editorial-voice-match: leest het als artikel uit de target
//     publication, of als brand-blog-post?
//   - value-first-not-sales: levert de body genuine editorial value
//     (data, story, insight) vs sales-pitch?
//   - brand-integration-naturalness: emerges de brand naturally in
//     paragraph 3+ als one-of-many examples, of staat het er crowbarred?
//   - buzzfeed-principle: zou een lezer dit artikel sharen WITHOUT
//     the brand connection? Pure editorial standalone-worth?
// =============================================================

import type { AdJudge, L2JudgeSuccess, ValidatorContext } from '../types';

const DIMENSIONS = [
  'editorial-voice-match',
  'value-first-not-sales',
  'brand-integration-naturalness',
  'buzzfeed-principle',
] as const;

type Dim = (typeof DIMENSIONS)[number];

function hasMinimalBrandContext(brand: { brandName?: string }): boolean {
  return !!(brand && brand.brandName && brand.brandName.trim().length > 0);
}

export const nativeAdJudge: AdJudge = {
  buildPrompt(ctx: ValidatorContext): string {
    const brand = ctx.brandContext;
    const brandBlock = hasMinimalBrandContext(brand)
      ? `## Brand context\nBrand: ${brand.brandName}${brand.voiceBaseline1Pager ? '\nVoice baseline:\n' + brand.voiceBaseline1Pager.slice(0, 600) : ''}\n`
      : '';

    const headline = ctx.groups.get('headline') ?? '(empty)';
    const subheadline = ctx.groups.get('subheadline') ?? '(empty)';
    const opening = ctx.groups.get('opening-paragraph') ?? '(empty)';
    const body = ctx.groups.get('body') ?? '(empty)';
    const brandIntegration = ctx.groups.get('brand-integration') ?? '(empty)';
    const closing = ctx.groups.get('closing') ?? '(empty)';
    const disclosure = ctx.groups.get('disclosure-position') ?? '(empty)';

    return [
      'You are a senior editorial director with 12+ years auditing sponsored content for premium publishers (NYT, The Atlantic, Wired, HBR, HubSpot blog network). You can spot when sponsored content reads as advertising vs as editorial in <5 seconds.',
      '',
      brandBlock,
      '## Sponsored article to judge',
      '',
      `Headline: ${headline}`,
      `Subheadline: ${subheadline}`,
      '',
      `Opening paragraph:\n${opening}`,
      '',
      `Body:\n${body}`,
      '',
      `Brand integration paragraph:\n${brandIntegration}`,
      '',
      `Closing:\n${closing}`,
      '',
      `Disclosure position note: ${disclosure}`,
      '',
      '## Dimensions to score (0-100 each)',
      '',
      `1. **editorial-voice-match**: Leest het als een artikel uit een premium publication (NYT / Atlantic / HBR / Wired), of als een brand-blog-post? Score hoger voor: data-driven framing, expert citations, inverted-pyramid structure, professional vocabulary. Lager voor: brand-promotional phrasing, "We are excited to announce...", marketing-speak ("revolutionary", "game-changing"), first-person brand voice.`,
      '',
      `2. **value-first-not-sales**: Levert de body genuine editorial value (data, story, framework, insight) die standalone interesting is? Of is de body een wrapper voor product-pitch? Score hoger voor: specific stats, expert quotes, case studies met data, framework explanations. Lager voor: feature-list disguised as benefits, vague "industry trends" filler, content die alleen bestaat om naar product te leiden.`,
      '',
      `3. **brand-integration-naturalness**: Emerges de brand naturally in paragraph 3+ als one-of-many examples ("One platform addressing this is [Brand]..." / "Tools like [Brand] have emerged..."), of staat het er crowbarred-in? Score hoger voor: brand als context-aware example tussen meerdere voorbeelden, voor brand-integration paragraph die past binnen de narrative arc. Lager voor: abrupt brand-mention, "Solution: Brand!", expliciete pivot van editorial naar advertising.`,
      '',
      `4. **buzzfeed-principle**: Zou een lezer dit artikel sharen ZONDER de brand connection? Pure editorial standalone-worth? Score op de "would I share this if Brand was removed?" question. Hoger = content staat op eigen merits. Lager = content is dependent op brand-narrative (zonder brand verliest het point).`,
      '',
      '## Output schema (JSON ONLY, no markdown fences)',
      '',
      '{',
      '  "dimensions": {',
      '    "editorial-voice-match": { "score": <0-100>, "rationale": "1-sentence why", "suggestion": "optional 1-sentence improvement" },',
      '    "value-first-not-sales": { "score": <0-100>, "rationale": "...", "suggestion": "..." },',
      '    "brand-integration-naturalness": { "score": <0-100>, "rationale": "...", "suggestion": "..." },',
      '    "buzzfeed-principle": { "score": <0-100>, "rationale": "...", "suggestion": "..." }',
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

export const NATIVE_AD_DIMENSIONS: readonly Dim[] = DIMENSIONS;
