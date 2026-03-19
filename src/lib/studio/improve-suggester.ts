// =============================================================
// Improve Suggestions Service
//
// Generates concrete improvement suggestions for content based
// on quality scores. Targets the weakest dimensions first.
//
// Each suggestion includes:
//  - Which dimension it improves
//  - The specific text to replace (currentText)
//  - The improved version (suggestedText)
//  - Why this change helps (reason)
//  - Estimated score impact (impactPoints)
// =============================================================

import { generateAIResponse } from '@/lib/ai/exploration/ai-caller';
import { resolveFeatureModel } from '@/lib/ai/feature-models.server';
import type { GenerationContext } from './context-builder';
import type { QualityDimension } from './quality-scorer';

// ─── Types ─────────────────────────────────────────────────

export interface SuggestionData {
  metric: string;
  impactPoints: number;
  currentText: string;
  suggestedText: string;
  reason: string;
}

// ─── Constants ────────────────────────────────────────────

const SUGGEST_SYSTEM_PROMPT = `You are a content improvement specialist. Given a piece of content and its quality scores, generate 3-5 specific, actionable suggestions to improve the content.

## RULES
1. Each suggestion must include the EXACT text from the content that should be replaced (currentText).
2. Each suggestion must include the replacement text (suggestedText).
3. Focus suggestions on the WEAKEST scoring dimensions first.
4. Suggestions should be concrete text edits, not vague advice.
5. Each suggestion's currentText must be a verbatim excerpt from the content (at least 10 characters).
6. If suggesting additions, set currentText to the sentence AFTER which the addition should go, and include the original sentence + new text in suggestedText.
7. Estimate impact in points (2-12 range). Higher impact for changes that address major weaknesses.

## OUTPUT FORMAT
Respond with ONLY a JSON array (no markdown fences):
[
  {
    "metric": "Brand Alignment",
    "impactPoints": 8,
    "currentText": "exact text from content to replace",
    "suggestedText": "improved replacement text",
    "reason": "Why this improves the score (1 sentence)"
  }
]

Generate 3-5 suggestions, sorted by impact (highest first).`;

// ─── Public API ────────────────────────────────────────────

/**
 * Generate improvement suggestions based on content and quality scores.
 * Returns suggestions sorted by highest impact first.
 */
export async function generateImproveSuggestions(
  content: string,
  dimensions: QualityDimension[],
  context: GenerationContext,
  contentType: string,
  workspaceId?: string,
): Promise<SuggestionData[]> {
  if (!content || content.trim().length < 50 || dimensions.length === 0) {
    return [];
  }

  const userPrompt = buildSuggestUserPrompt(content, dimensions, context, contentType);

  try {
    const { provider, model } = workspaceId
      ? await resolveFeatureModel(workspaceId, 'content-improve')
      : { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929' };

    const response = await generateAIResponse(
      provider,
      model,
      SUGGEST_SYSTEM_PROMPT,
      userPrompt,
      0.5,
      3000,
    );

    return parseSuggestionsResponse(response);
  } catch (error) {
    console.error('Improve suggestions AI call failed:', error);
    return [];
  }
}

// ─── Helpers ──────────────────────────────────────────────

function buildSuggestUserPrompt(
  content: string,
  dimensions: QualityDimension[],
  context: GenerationContext,
  contentType: string,
): string {
  const parts: string[] = [];

  // Show quality scores so AI knows what to focus on
  parts.push('## CURRENT QUALITY SCORES');
  const sorted = [...dimensions].sort((a, b) => a.score - b.score);
  for (const dim of sorted) {
    parts.push(`- ${dim.name}: ${dim.score}/100 — ${dim.explanation}`);
  }
  parts.push('');

  // Include brand context for alignment suggestions
  if (context.brandContext) {
    parts.push(context.brandContext);
    parts.push('');
  }

  if (context.personaContext) {
    parts.push(context.personaContext);
    parts.push('');
  }

  parts.push(`## CONTENT TYPE: ${contentType}`);
  parts.push('');
  parts.push('## CONTENT TO IMPROVE');
  parts.push(content);

  return parts.join('\n');
}

function parseSuggestionsResponse(raw: string): SuggestionData[] {
  try {
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (s: Record<string, unknown>) =>
          typeof s.metric === 'string' &&
          typeof s.currentText === 'string' &&
          typeof s.suggestedText === 'string' &&
          s.currentText.length >= 5 &&
          s.suggestedText.length >= 5,
      )
      .slice(0, 5)
      .map((s: Record<string, unknown>) => ({
        metric: String(s.metric),
        impactPoints: clampImpact(s.impactPoints as number),
        currentText: String(s.currentText),
        suggestedText: String(s.suggestedText),
        reason: String(s.reason || ''),
      }));
  } catch {
    console.error('Failed to parse improvement suggestions response');
    return [];
  }
}

function clampImpact(value: number | undefined): number {
  if (value === undefined || isNaN(value)) return 5;
  return Math.max(1, Math.min(15, Math.round(value)));
}
