// =============================================================
// L2 AI-Judge — linkedin/linkedin-ad (Sponsored Post)
//
// 3 dimensions per spec sectie 5.2:
//   - professional-tone: LinkedIn audience expects formal/corporate
//     register. Score lower for slang, excessive casual contractions.
//   - value-prop-clarity: kan een B2B decision-maker in <3 seconden
//     het value-prop herleiden? Of vereist het inferenties?
//   - b2b-relevance: matched de body een professional pain-point of
//     business-outcome? Of leest het als consumer-targeted?
// =============================================================

import type { AdJudge, L2JudgeSuccess, ValidatorContext } from '../types';

const DIMENSIONS = ['professional-tone', 'value-prop-clarity', 'b2b-relevance'] as const;

type Dim = (typeof DIMENSIONS)[number];

function hasMinimalBrandContext(brand: { brandName?: string }): boolean {
  return !!(brand && brand.brandName && brand.brandName.trim().length > 0);
}

export const linkedinAdJudge: AdJudge = {
  buildPrompt(ctx: ValidatorContext): string {
    const brand = ctx.brandContext;
    const brandBlock = hasMinimalBrandContext(brand)
      ? `## Brand context\nBrand: ${brand.brandName}${brand.voiceBaseline1Pager ? '\nVoice baseline:\n' + brand.voiceBaseline1Pager.slice(0, 600) : ''}\n`
      : '';

    const body = ctx.groups.get('body') ?? '(empty)';
    const headline = ctx.groups.get('headline') ?? '(empty)';
    const description = ctx.groups.get('description') ?? '(empty)';
    const cta = ctx.groups.get('cta-button') ?? '(empty)';
    const imageDirection = ctx.groups.get('image') ?? '(empty)';

    return [
      'You are a senior LinkedIn advertising creative director with 10+ years auditing B2B Sponsored Posts against LinkedIn Relevance Score + Click-Through-Rate signals. You understand the LinkedIn audience demands corporate / formal register and reward content that directly addresses business pain-points.',
      '',
      brandBlock,
      '## Ad to judge',
      '',
      `Body (primary text): ${body}`,
      `Headline (link-card): ${headline}`,
      `Description (link-card sub): ${description}`,
      `CTA button: ${cta}`,
      '',
      `Image direction: ${imageDirection}`,
      '',
      '## Dimensions to score (0-100 each)',
      '',
      `1. **professional-tone**: LinkedIn audience verwacht formal corporate register. Score lager voor:`,
      `   - Excessive casual contractions (don't, gonna, kinda)`,
      `   - Consumer slang (vibe, lit, fr, lowkey)`,
      `   - Excessive emojis (>3) of decorative emojis`,
      `   - Overly casual greetings ("Hey there!", "What's up...")`,
      `   Score higher voor data-driven analytical framing met expert vocabulary.`,
      ``,
      `2. **value-prop-clarity**: Kan een time-pressed B2B decision-maker in <3 seconden het value-prop herleiden? Score op:`,
      `   - Headline = clear outcome (niet brand intro)`,
      `   - Body first sentence = pain-point of outcome (niet "We are excited to announce...")`,
      `   - Specific numbers / proof points (3x faster, 40% reduction) > vague claims (much better, significantly improved)`,
      ``,
      `3. **b2b-relevance**: Matched de body een professional pain-point of business-outcome? Of leest het als consumer-targeted? Score op:`,
      `   - Topic = work-related (productivity, ROI, team, strategy, growth, efficiency)`,
      `   - Decision-maker register (CEO/CMO/CTO audience-fit)`,
      `   - Industry-aware (B2B SaaS, financial services, enterprise tech, etc.)`,
      `   Score lager voor consumer-vibe (lifestyle, leisure, personal hobby framing).`,
      '',
      '## Output schema (JSON ONLY, no markdown fences)',
      '',
      '{',
      '  "dimensions": {',
      '    "professional-tone": { "score": <0-100>, "rationale": "1-sentence why", "suggestion": "optional 1-sentence improvement" },',
      '    "value-prop-clarity": { "score": <0-100>, "rationale": "...", "suggestion": "..." },',
      '    "b2b-relevance": { "score": <0-100>, "rationale": "...", "suggestion": "..." }',
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

export const LINKEDIN_AD_DIMENSIONS: readonly Dim[] = DIMENSIONS;
