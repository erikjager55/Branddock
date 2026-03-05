// =============================================================
// Market Research AI Prompts
//
// System + user prompt templates for AI-powered market insight
// generation via Gemini 3.1 Pro.
// =============================================================

import type { BrandContextBlock } from '../prompt-templates';

/** Build the system prompt for market research. */
export function buildMarketResearchSystemPrompt(brandContext?: BrandContextBlock): string {
  let ctx = '';

  if (brandContext) {
    const parts: string[] = [];
    if (brandContext.brandName) parts.push(`Brand: ${brandContext.brandName}`);
    if (brandContext.brandMission) parts.push(`Mission: ${brandContext.brandMission}`);
    if (brandContext.brandVision) parts.push(`Vision: ${brandContext.brandVision}`);
    if (brandContext.brandValues?.length) parts.push(`Values: ${brandContext.brandValues.join(', ')}`);
    if (brandContext.targetAudience) parts.push(`Target Audience: ${brandContext.targetAudience}`);
    if (brandContext.productsOverview) parts.push(`Products: ${brandContext.productsOverview}`);
    if (brandContext.competitiveLandscape) parts.push(`Competitive Landscape: ${brandContext.competitiveLandscape}`);

    if (parts.length > 0) {
      ctx = `\n\n## Brand Context\n${parts.join('\n')}`;
    }
  }

  return `You are a senior market research analyst specializing in trend analysis, competitive intelligence and strategic foresight.

Your task is to generate actionable market insights based on a user's research prompt. Each insight must be specific, evidence-based and relevant for brand strategy decisions.${ctx}

## Output Format
Respond with valid JSON only. No markdown, no explanation outside the JSON.

The JSON must match this exact structure:
{
  "insights": [
    {
      "title": "Short, specific insight title (max 100 chars)",
      "description": "2-3 sentence description of the insight with concrete details",
      "category": "TECHNOLOGY" | "ENVIRONMENTAL" | "SOCIAL" | "CONSUMER" | "BUSINESS",
      "scope": "MICRO" | "MESO" | "MACRO",
      "impactLevel": "HIGH" | "MEDIUM" | "LOW",
      "timeframe": "SHORT_TERM" | "MEDIUM_TERM" | "LONG_TERM",
      "relevanceScore": 50-100,
      "industries": ["industry1", "industry2"],
      "tags": ["tag1", "tag2", "tag3"],
      "howToUse": [
        "Specific, actionable recommendation 1",
        "Specific, actionable recommendation 2",
        "Specific, actionable recommendation 3"
      ]
    }
  ]
}

## Guidelines
- Each insight must have a unique, descriptive title
- Descriptions should include specific data points, percentages or examples where possible
- Assign category based on the primary domain of the insight
- Scope: MICRO = company level, MESO = industry level, MACRO = market/societal level
- Impact: HIGH = requires immediate strategic response, MEDIUM = monitor and plan, LOW = awareness
- Timeframe: SHORT_TERM = 0-6 months, MEDIUM_TERM = 6-18 months, LONG_TERM = 18+ months
- relevanceScore: 50-70 = useful context, 70-85 = strategically relevant, 85-100 = critical for strategy
- howToUse items must be specific and actionable, not generic advice
- tags should be 2-5 specific keywords per insight`;
}

/** Build the user prompt with research parameters. */
export function buildMarketResearchUserPrompt(params: {
  prompt: string;
  focusAreas?: string[];
  industries?: string[];
  timeframeFocus?: string;
  numberOfInsights: number;
}): string {
  const parts: string[] = [
    `Research prompt: "${params.prompt}"`,
    `Generate exactly ${params.numberOfInsights} market insight(s).`,
  ];

  if (params.focusAreas?.length) {
    parts.push(`Focus areas: ${params.focusAreas.join(', ')}`);
  }

  if (params.industries?.length) {
    parts.push(`Industry context: ${params.industries.join(', ')}`);
  }

  if (params.timeframeFocus && params.timeframeFocus !== 'all') {
    const label = params.timeframeFocus === 'short-term'
      ? 'short-term trends (0-6 months)'
      : 'long-term trends (18+ months)';
    parts.push(`Prioritize ${label}.`);
  }

  return parts.join('\n');
}
