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
  // Brand strategy assets (from 11 canonical brand assets)
  brandPurpose?: string;
  goldenCircle?: string;
  brandEssence?: string;
  brandPromise?: string;
  brandMission?: string;
  brandVision?: string;
  brandArchetype?: string;
  brandPersonality?: string;
  brandStory?: string;
  brandValues?: string[];
  transformativeGoals?: string;
  socialRelevancy?: string;
  // Visual identity (from brandstyle)
  brandColors?: string;
  brandTypography?: string;
  brandToneOfVoice?: string;
  brandImageryStyle?: string;
  brandDesignLanguage?: string;
  brandVisualLanguage?: string;
  // External context
  targetAudience?: string;
  industry?: string;
  productsOverview?: string;
  competitorAnalysis?: string;
  competitiveLandscape?: string;
  // Consistent AI models
  consistentModels?: string;
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

  // Deduplication note for AI
  lines.push('');
  lines.push('> Brand Archetype defines psychological identity; Brand Personality defines voice, tone, and visual expression. Prioritize Brand Personality for tone/voice guidance.');
  lines.push('');

  // Brand strategy foundation
  if (ctx.brandPurpose) lines.push(`**Purpose:** ${ctx.brandPurpose}`);
  if (ctx.goldenCircle) lines.push(`**Golden Circle:**\n${ctx.goldenCircle}`);
  if (ctx.brandEssence) lines.push(`**Brand Essence:** ${ctx.brandEssence}`);
  if (ctx.brandPromise) lines.push(`**Brand Promise:** ${ctx.brandPromise}`);
  if (ctx.brandMission) lines.push(`**Mission:** ${ctx.brandMission}`);
  if (ctx.brandVision) lines.push(`**Vision:** ${ctx.brandVision}`);
  if (ctx.brandArchetype) lines.push(`**Brand Archetype:** ${ctx.brandArchetype}`);
  if (ctx.brandPersonality) lines.push(`**Brand Personality:** ${ctx.brandPersonality}`);
  if (ctx.brandStory) lines.push(`**Brand Story:** ${ctx.brandStory}`);
  if (ctx.brandValues?.length) lines.push(`**Core Values:** ${ctx.brandValues.join(', ')}`);
  if (ctx.transformativeGoals) lines.push(`**Transformative Goals:** ${ctx.transformativeGoals}`);
  if (ctx.socialRelevancy) lines.push(`**Social Relevancy:** ${ctx.socialRelevancy}`);

  // Visual identity
  if (ctx.brandColors) lines.push(`**Brand Colors:** ${ctx.brandColors}`);
  if (ctx.brandTypography) lines.push(`**Typography:** ${ctx.brandTypography}`);
  if (ctx.brandToneOfVoice) lines.push(`**Tone of Voice:** ${ctx.brandToneOfVoice}`);
  if (ctx.brandImageryStyle) lines.push(`**Imagery Style:** ${ctx.brandImageryStyle}`);
  if (ctx.brandDesignLanguage) lines.push(`**Design Language:** ${ctx.brandDesignLanguage}`);
  if (ctx.brandVisualLanguage) lines.push(`**Visual Language (Vormentaal):** ${ctx.brandVisualLanguage}`);

  // External context
  if (ctx.targetAudience) lines.push(`**Target Audience:** ${ctx.targetAudience}`);
  if (ctx.industry) lines.push(`**Industry:** ${ctx.industry}`);
  if (ctx.productsOverview) lines.push(`**Products/Services:** ${ctx.productsOverview}`);
  if (ctx.competitorAnalysis) {
    lines.push(`**Competitor Analysis:**`);
    lines.push(ctx.competitorAnalysis);
  }
  if (ctx.competitiveLandscape) {
    lines.push(`**Market Trends & Competitive Landscape:**`);
    lines.push(ctx.competitiveLandscape);
  }

  // Consistent AI models
  if (ctx.consistentModels) {
    lines.push(`**Consistent AI Models:**`);
    lines.push(ctx.consistentModels);
  }

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
