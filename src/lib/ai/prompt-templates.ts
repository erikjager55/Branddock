// =============================================================
// Prompt Templates (R0.8)
//
// Reusable system prompt fragments and builders.
// Three base templates:
//  - SYSTEM_BASE:  brand strategist persona + workspace context
//  - ANALYSIS:     structured analysis output format
//  - STRUCTURED:   strict JSON response instructions
//
// Brand context is injected at runtime by brand-context.ts.
// =============================================================

import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// ─── Types ─────────────────────────────────────────────────

export interface BrandContextBlock {
  brandName?: string;
  brandMission?: string;
  brandVision?: string;
  brandValues?: string[];
  targetAudience?: string;
  industry?: string;
  productsOverview?: string;
  competitiveLandscape?: string;
}

// ─── System prompt fragments ───────────────────────────────

export const SYSTEM_BASE = `You are a senior brand strategist and marketing consultant for Branddock, a SaaS platform for brand strategy, research validation and AI content generation.

You help users build and refine their brand strategy. You are knowledgeable about:
- Brand architecture, positioning and messaging
- Market research and consumer insights
- Content strategy and creative direction
- Business strategy (OKRs, competitive analysis)

Guidelines:
- Be concise and actionable — prioritise practical advice over theory
- Use the brand context provided to give personalised recommendations
- When analysing, be honest about weaknesses without being discouraging
- Format responses with clear headings and bullet points where appropriate
- Write in the same language as the user's input`;

export const ANALYSIS_INSTRUCTIONS = `Provide your analysis in the following structure:
1. **Summary** — 2-3 sentence overview
2. **Strengths** — what's working well
3. **Weaknesses** — areas for improvement
4. **Recommendations** — prioritised action items (max 5)
5. **Score** — overall alignment score 0-100 with brief justification`;

export const STRUCTURED_INSTRUCTIONS = `You MUST respond with valid JSON only. No markdown, no code fences, no explanatory text outside the JSON object. Follow the exact schema requested.`;

// ─── Brand context formatter ───────────────────────────────

export function formatBrandContext(ctx: BrandContextBlock): string {
  const lines: string[] = ['## Brand Context'];

  if (ctx.brandName) lines.push(`**Brand Name:** ${ctx.brandName}`);
  if (ctx.brandMission) lines.push(`**Mission:** ${ctx.brandMission}`);
  if (ctx.brandVision) lines.push(`**Vision:** ${ctx.brandVision}`);
  if (ctx.brandValues?.length) lines.push(`**Values:** ${ctx.brandValues.join(', ')}`);
  if (ctx.targetAudience) lines.push(`**Target Audience:** ${ctx.targetAudience}`);
  if (ctx.industry) lines.push(`**Industry:** ${ctx.industry}`);
  if (ctx.productsOverview) lines.push(`**Products/Services:** ${ctx.productsOverview}`);
  if (ctx.competitiveLandscape) lines.push(`**Competitive Landscape:** ${ctx.competitiveLandscape}`);

  return lines.join('\n');
}

// ─── Message builders ──────────────────────────────────────

/**
 * Build a system message with optional brand context.
 */
export function buildSystemMessage(
  brandContext?: BrandContextBlock,
  additionalInstructions?: string,
): ChatCompletionMessageParam {
  let content = SYSTEM_BASE;

  if (brandContext) {
    content += '\n\n' + formatBrandContext(brandContext);
  }

  if (additionalInstructions) {
    content += '\n\n' + additionalInstructions;
  }

  return { role: 'system', content };
}

/**
 * Build a full message array for analysis use cases.
 */
export function buildAnalysisMessages(
  userPrompt: string,
  brandContext?: BrandContextBlock,
): ChatCompletionMessageParam[] {
  return [
    buildSystemMessage(brandContext, ANALYSIS_INSTRUCTIONS),
    { role: 'user', content: userPrompt },
  ];
}

/**
 * Build a full message array for structured (JSON) output.
 */
export function buildStructuredMessages(
  userPrompt: string,
  brandContext?: BrandContextBlock,
): ChatCompletionMessageParam[] {
  return [
    buildSystemMessage(brandContext, STRUCTURED_INSTRUCTIONS),
    { role: 'user', content: userPrompt },
  ];
}

/**
 * Build a full message array for chat-style interactions.
 */
export function buildChatMessages(
  history: ChatCompletionMessageParam[],
  brandContext?: BrandContextBlock,
): ChatCompletionMessageParam[] {
  return [
    buildSystemMessage(brandContext),
    ...history,
  ];
}
