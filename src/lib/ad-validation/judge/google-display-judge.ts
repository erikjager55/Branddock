// =============================================================
// L2 AI-Judge — google/display-ad (Responsive Display Ads / RDA)
//
// 4 dimensions per ADR 2026-05-22-ad-quality-validation addendum:
//   - asset-quantity: count headlines + descriptions vs Google's
//     5+5 target voor "Excellent" Ad Strength
//   - asset-diversity: zijn de 5 short-headlines fundamenteel
//     different hook-angles, of paraphrases van één angle?
//   - asset-quality-per-type: readability + value-prop clarity per
//     slot, geaggregeerd
//   - image-direction-multi-aspect: werkt de art-direction in zowel
//     landscape 1.91:1 als square 1:1 crops?
// =============================================================

import type { AdJudge, L2JudgeSuccess, ValidatorContext } from '../types';

const DIMENSIONS = [
  'asset-quantity',
  'asset-diversity',
  'asset-quality-per-type',
  'image-direction-multi-aspect',
] as const;

type Dim = (typeof DIMENSIONS)[number];

function hasMinimalBrandContext(brand: { brandName?: string }): boolean {
  return !!(brand && brand.brandName && brand.brandName.trim().length > 0);
}

export const googleDisplayAdJudge: AdJudge = {
  buildPrompt(ctx: ValidatorContext): string {
    const brand = ctx.brandContext;
    const brandBlock = hasMinimalBrandContext(brand)
      ? `## Brand context\nBrand: ${brand.brandName}${brand.voiceBaseline1Pager ? '\nVoice baseline:\n' + brand.voiceBaseline1Pager.slice(0, 600) : ''}\n`
      : '';

    const shortHeadlines = [1, 2, 3, 4, 5]
      .map((n) => {
        const sh = ctx.groups.get(`short-headline-${n}`) ?? '';
        return sh ? `  SH${n}: ${sh}` : `  SH${n}: (empty)`;
      })
      .join('\n');

    const longHeadline = ctx.groups.get('long-headline') ?? '(empty)';

    const descriptions = [1, 2, 3, 4, 5]
      .map((n) => {
        const d = ctx.groups.get(`description-${n}`) ?? '';
        return d ? `  D${n}: ${d}` : `  D${n}: (empty)`;
      })
      .join('\n');

    const businessName = ctx.groups.get('business-name') ?? '(empty)';
    const imageDirection = ctx.groups.get('image') ?? '(empty)';

    return [
      'You are a senior Google Ads strategist with 12+ years auditing Responsive Display Ads against Google Ad Strength scoring (Poor / Average / Good / Excellent).',
      '',
      brandBlock,
      '## RDA assets to judge',
      '',
      'Short headlines (≤30 chars each):',
      shortHeadlines,
      '',
      `Long headline (≤90): ${longHeadline}`,
      '',
      'Descriptions (≤90 chars each):',
      descriptions,
      '',
      `Business name: ${businessName}`,
      '',
      `Image direction: ${imageDirection}`,
      '',
      '## Dimensions to score (0-100 each)',
      '',
      `1. **asset-quantity**: Count filled short-headlines (target 5) + descriptions (target 5). Google's "Excellent" Ad Strength requires 5+5. Score linear: 1 of each = ~20, 5 of each = 100. Empty long-headline of business-name caps at 50.`,
      `2. **asset-diversity**: Do the 5 short-headlines test fundamentally DIFFERENT hook-angles (claim / question / stat / contrarian / outcome) or are they paraphrases of one angle? Same for descriptions. Score lower for paraphrase-clusters — Google's ML penaliseert lage diversity.`,
      `3. **asset-quality-per-type**: Per-slot readability + value-prop clarity. Each short-headline standalone-readable in <1.5s? Each description adds NEW info (not paraphrasing a headline)? Business-name correct + clean? Score average.`,
      `4. **image-direction-multi-aspect**: Does the art-direction translate to BOTH landscape 1.91:1 AND square 1:1 crops? Subject + composition portable? OR does it only work in one ratio? Empty image direction = 0. >20% text-on-image specification caps at 30.`,
      '',
      '## Output schema (JSON ONLY, no markdown fences)',
      '',
      '{',
      '  "dimensions": {',
      '    "asset-quantity": { "score": <0-100>, "rationale": "1-sentence why", "suggestion": "optional 1-sentence improvement" },',
      '    "asset-diversity": { "score": <0-100>, "rationale": "...", "suggestion": "..." },',
      '    "asset-quality-per-type": { "score": <0-100>, "rationale": "...", "suggestion": "..." },',
      '    "image-direction-multi-aspect": { "score": <0-100>, "rationale": "...", "suggestion": "..." }',
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

export const GOOGLE_DISPLAY_DIMENSIONS: readonly Dim[] = DIMENSIONS;
