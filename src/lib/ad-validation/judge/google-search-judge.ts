// =============================================================
// L2 AI-Judge — google/search-ad (Responsive Search Ads)
//
// 4 dimensions per spec sectie 5.2:
//   - hook-strength: how scroll-stopping is H1 in SERP context?
//   - headline-uniqueness: do H1/H2/H3 each carry distinct meaning,
//     or do they overlap conceptually?
//   - cta-clarity: does D2 close with a specific action-oriented CTA?
//   - keyword-relevance: how naturally is the primary keyword
//     integrated into H1 + D1?
//
// Each dimension scored 0-100 with rationale + optional suggestion.
// =============================================================

import type { AdJudge, L2JudgeSuccess, ValidatorContext } from '../types';

const DIMENSIONS = [
  'hook-strength',
  'headline-uniqueness',
  'cta-clarity',
  'keyword-relevance',
] as const;

type Dim = (typeof DIMENSIONS)[number];

function hasMinimalBrandContext(brand: { brandName?: string }): boolean {
  return !!(brand && brand.brandName && brand.brandName.trim().length > 0);
}

export const googleSearchAdJudge: AdJudge = {
  buildPrompt(ctx: ValidatorContext): string {
    const brand = ctx.brandContext;
    const brandBlock = hasMinimalBrandContext(brand)
      ? `## Brand context\nBrand: ${brand.brandName}${brand.voiceBaseline1Pager ? '\nVoice baseline:\n' + brand.voiceBaseline1Pager.slice(0, 600) : ''}\n`
      : '';

    const keyword = ctx.primaryKeyword ?? '(none specified)';
    const h1 = ctx.groups.get('headline-1') ?? '';
    const h2 = ctx.groups.get('headline-2') ?? '';
    const h3 = ctx.groups.get('headline-3') ?? '';
    const d1 = ctx.groups.get('description-1') ?? '';
    const d2 = ctx.groups.get('description-2') ?? '';
    const path1 = ctx.groups.get('path-1') ?? '';
    const path2 = ctx.groups.get('path-2') ?? '';
    const sitelinks = [1, 2, 3, 4].map((n) => {
      const t = ctx.groups.get(`sitelink-${n}-title`) ?? '';
      const d = ctx.groups.get(`sitelink-${n}-description`) ?? '';
      return t || d ? `  S${n}: ${t} — ${d}` : '';
    }).filter(Boolean).join('\n');

    return [
      'You are a senior Google Ads quality judge with 10+ years auditing Responsive Search Ads against Google Ad Strength + Quality Score criteria.',
      '',
      brandBlock,
      `## Ad to judge`,
      ``,
      `Primary keyword: ${keyword}`,
      ``,
      `Headlines:`,
      `  H1: ${h1}`,
      `  H2: ${h2}`,
      `  H3: ${h3}`,
      ``,
      `Descriptions:`,
      `  D1: ${d1}`,
      `  D2: ${d2}`,
      ``,
      `Display path: /${path1}${path2 ? '/' + path2 : ''}`,
      ``,
      `Sitelinks:`,
      sitelinks || '  (none provided)',
      ``,
      '## Dimensions to score (0-100 each)',
      '',
      `1. **hook-strength**: How scroll-stopping is H1 in SERP context? Specific value, bold claim, or curiosity? Score lower if generic ("Get Started", "Learn More").`,
      `2. **headline-uniqueness**: Do H1, H2, H3 carry DISTINCT meanings? Or paraphrases? Score lower if 2 say the same thing differently.`,
      `3. **cta-clarity**: Does D2 close with a specific action-oriented CTA (verb + benefit)? Score lower if no CTA or generic "Learn more".`,
      `4. **keyword-relevance**: How naturally is "${keyword}" integrated into H1 + D1? Score lower if absent OR stuffed unnaturally.`,
      '',
      '## Output schema (JSON ONLY, no markdown fences)',
      '',
      '{',
      '  "dimensions": {',
      '    "hook-strength": { "score": <0-100>, "rationale": "1-sentence why", "suggestion": "optional 1-sentence improvement" },',
      '    "headline-uniqueness": { "score": <0-100>, "rationale": "...", "suggestion": "..." },',
      '    "cta-clarity": { "score": <0-100>, "rationale": "...", "suggestion": "..." },',
      '    "keyword-relevance": { "score": <0-100>, "rationale": "...", "suggestion": "..." }',
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

// Expose dimension list for UI rendering ordering.
export const GOOGLE_SEARCH_DIMENSIONS: readonly Dim[] = DIMENSIONS;
