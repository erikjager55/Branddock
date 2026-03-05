// =============================================================
// Trend Analysis AI Prompts
//
// System + user prompt templates for AI-powered trend detection
// from scraped website content via Gemini 3.1 Pro.
// =============================================================

import type { BrandContextBlock } from '../prompt-templates';

/** Build the system prompt for trend detection from scraped content. */
export function buildTrendAnalysisSystemPrompt(brandContext?: BrandContextBlock): string {
  let ctx = '';

  if (brandContext) {
    const parts: string[] = [];
    if (brandContext.brandName) parts.push(`Brand: ${brandContext.brandName}`);
    if (brandContext.brandMission) parts.push(`Mission: ${brandContext.brandMission}`);
    if (brandContext.brandVision) parts.push(`Vision: ${brandContext.brandVision}`);
    if (brandContext.brandValues?.length) parts.push(`Values: ${brandContext.brandValues.join(', ')}`);
    if (brandContext.targetAudience) parts.push(`Target Audience: ${brandContext.targetAudience}`);
    if (brandContext.productsOverview) parts.push(`Products: ${brandContext.productsOverview}`);

    if (parts.length > 0) {
      ctx = `\n\n## Brand Context (use to calculate relevanceScore)\n${parts.join('\n')}`;
    }
  }

  return `You are a senior trend analyst specializing in brand strategy, competitive intelligence and market foresight.

Your task is to detect emerging trends from website content that has changed since the last scan. Identify only NEW, specific trends — not general knowledge or obvious facts.${ctx}

## Output Format
Respond with valid JSON only. No markdown, no explanation outside the JSON.

The JSON must match this exact structure:
{
  "trends": [
    {
      "title": "Short, specific trend title (max 100 chars)",
      "description": "2-3 sentence description with concrete details and data points",
      "category": "CONSUMER_BEHAVIOR" | "TECHNOLOGY" | "MARKET_DYNAMICS" | "COMPETITIVE" | "REGULATORY",
      "scope": "MICRO" | "MESO" | "MACRO",
      "impactLevel": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
      "timeframe": "SHORT_TERM" | "MEDIUM_TERM" | "LONG_TERM",
      "relevanceScore": 50-100,
      "direction": "rising" | "declining" | "stable",
      "confidence": 50-100,
      "rawExcerpt": "The exact sentence or paragraph from the source that supports this trend",
      "industries": ["industry1", "industry2"],
      "tags": ["tag1", "tag2", "tag3"],
      "howToUse": [
        "Specific, actionable recommendation for brand strategy",
        "Another specific recommendation"
      ]
    }
  ]
}

## Detection Guidelines
- Only extract GENUINE trends — shifts, movements, emerging patterns
- Skip press releases, product announcements, job postings, or events
- Each trend must have supporting evidence from the source text (rawExcerpt)
- If no meaningful trends are found, return {"trends": []}
- Scope: MICRO = company level, MESO = industry level, MACRO = market/societal level
- Impact: HIGH = requires strategic response, MEDIUM = monitor and plan, LOW = awareness
- Timeframe: SHORT_TERM = 0-6 months, MEDIUM_TERM = 6-18 months, LONG_TERM = 18+ months
- direction: rising = growing in importance, declining = fading, stable = persistent
- confidence: how confident are you this is a real trend (not noise)?
- relevanceScore: 50-70 = useful context, 70-85 = strategically relevant, 85-100 = critical
- Maximum 5 trends per source — quality over quantity`;
}

/** Build the user prompt with the scraped content diff. */
export function buildTrendAnalysisUserPrompt(params: {
  sourceName: string;
  sourceUrl: string;
  newContent: string;
  previousContentSummary?: string;
}): string {
  const parts: string[] = [
    `Source: "${params.sourceName}" (${params.sourceUrl})`,
    '',
    '## New/Changed Content',
    params.newContent.slice(0, 8000), // cap at 8k chars
  ];

  if (params.previousContentSummary) {
    parts.push('', '## Previous Content Summary (for comparison)');
    parts.push(params.previousContentSummary.slice(0, 2000));
  }

  parts.push('', 'Detect any emerging trends from this content. Return JSON only.');

  return parts.join('\n');
}
