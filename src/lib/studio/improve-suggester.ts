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
import { getDeliverableTypeById } from '@/features/campaigns/lib/deliverable-types';
import { buildBrandVoiceDirective } from './brand-voice-directive';
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
8. Suggestions must maintain the brand's voice identity. If content deviates from the BRAND VOICE DIRECTIVE, prioritize voice-correcting suggestions (wrong language, wrong tone, missing brand name, prohibited words).

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
 * When a deliverableTypeId is provided, suggestions reference type-specific
 * best practices and constraints (e.g. character limits, required sections).
 * Returns suggestions sorted by highest impact first.
 */
export async function generateImproveSuggestions(
  content: string,
  dimensions: QualityDimension[],
  context: GenerationContext,
  contentType: string,
  workspaceId?: string,
  deliverableTypeId?: string,
): Promise<SuggestionData[]> {
  if (!content || content.trim().length < 50 || dimensions.length === 0) {
    return [];
  }

  const typeDef = deliverableTypeId ? getDeliverableTypeById(deliverableTypeId) : undefined;

  // Build brand voice directive for voice-aware suggestions
  const voiceDirective = workspaceId
    ? await buildBrandVoiceDirective(workspaceId, { deliverableTypeId })
    : '';

  const systemPrompt = buildTypeAwareSystemPrompt(deliverableTypeId, typeDef, voiceDirective);
  const userPrompt = buildSuggestUserPrompt(content, dimensions, context, contentType, typeDef);

  try {
    const { provider, model } = workspaceId
      ? await resolveFeatureModel(workspaceId, 'content-improve')
      : { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929' };

    const response = await generateAIResponse(
      provider,
      model,
      systemPrompt,
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

/**
 * Build a type-aware system prompt. When a type definition is found,
 * inject quality criteria names and constraint awareness into the prompt
 * so the AI generates type-specific suggestions.
 */
function buildTypeAwareSystemPrompt(
  deliverableTypeId?: string,
  typeDef?: ReturnType<typeof getDeliverableTypeById>,
  voiceDirective?: string,
): string {
  const basePrompt = voiceDirective
    ? `${voiceDirective}\n\n${SUGGEST_SYSTEM_PROMPT}`
    : SUGGEST_SYSTEM_PROMPT;

  if (!deliverableTypeId) return basePrompt;

  const resolvedTypeDef = typeDef ?? getDeliverableTypeById(deliverableTypeId);
  if (!resolvedTypeDef) return basePrompt;

  const typeSpecificParts: string[] = [];

  // Inject quality criteria so the AI focuses on type-specific dimensions
  if (resolvedTypeDef.qualityCriteria && resolvedTypeDef.qualityCriteria.length > 0) {
    typeSpecificParts.push('## TYPE-SPECIFIC QUALITY CRITERIA');
    typeSpecificParts.push(`This content is a "${resolvedTypeDef.name}". Focus suggestions on these specific quality criteria:`);
    for (const criterion of resolvedTypeDef.qualityCriteria) {
      typeSpecificParts.push(`- **${criterion.name}** (weight: ${Math.round(criterion.weight * 100)}%): ${criterion.description}`);
    }
    typeSpecificParts.push('Use these criteria names in the "metric" field of your suggestions when relevant.');
    typeSpecificParts.push('');
  }

  // Inject constraint awareness into the system prompt
  if (resolvedTypeDef.constraints) {
    const c = resolvedTypeDef.constraints;
    typeSpecificParts.push('## CONTENT TYPE CONSTRAINTS');
    typeSpecificParts.push(`Ensure suggestions respect these "${resolvedTypeDef.name}" constraints:`);
    if (c.maxChars) typeSpecificParts.push(`- Maximum ${c.maxChars} characters`);
    if (c.minChars) typeSpecificParts.push(`- Minimum ${c.minChars} characters`);
    if (c.maxWords) typeSpecificParts.push(`- Maximum ${c.maxWords} words`);
    if (c.minWords) typeSpecificParts.push(`- Minimum ${c.minWords} words`);
    if (c.maxHashtags) typeSpecificParts.push(`- Maximum ${c.maxHashtags} hashtags`);
    if (c.maxSlides) typeSpecificParts.push(`- Maximum ${c.maxSlides} slides`);
    if (c.requiredSections && c.requiredSections.length > 0) {
      typeSpecificParts.push(`- Required sections: ${c.requiredSections.join(', ')}`);
    }
    typeSpecificParts.push('If the content violates any constraint, prioritize a suggestion to fix it.');
    typeSpecificParts.push('');
  }

  if (typeSpecificParts.length === 0) return basePrompt;

  return basePrompt + '\n\n' + typeSpecificParts.join('\n');
}

function buildSuggestUserPrompt(
  content: string,
  dimensions: QualityDimension[],
  context: GenerationContext,
  contentType: string,
  typeDef?: ReturnType<typeof getDeliverableTypeById>,
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

  // Add type-specific constraints to the user prompt for emphasis
  if (typeDef?.constraints) {
    const c = typeDef.constraints;
    const constraintLines: string[] = [];
    if (c.maxChars) constraintLines.push(`Maximum ${c.maxChars} characters per post`);
    if (c.minChars) constraintLines.push(`Minimum ${c.minChars} characters`);
    if (c.maxWords) constraintLines.push(`Maximum ${c.maxWords} words`);
    if (c.minWords) constraintLines.push(`Minimum ${c.minWords} words`);
    if (c.maxHashtags) constraintLines.push(`Maximum ${c.maxHashtags} hashtags`);
    if (c.maxSlides) constraintLines.push(`Maximum ${c.maxSlides} slides`);
    if (c.requiredSections && c.requiredSections.length > 0) {
      constraintLines.push(`Required sections: ${c.requiredSections.join(', ')}`);
    }
    if (constraintLines.length > 0) {
      parts.push('## CONTENT CONSTRAINTS');
      for (const line of constraintLines) {
        parts.push(`- ${line}`);
      }
      parts.push('');
    }
  }

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
        impactPoints: clampImpact(s.impactPoints),
        currentText: String(s.currentText),
        suggestedText: String(s.suggestedText),
        reason: String(s.reason || ''),
      }));
  } catch {
    console.error('Failed to parse improvement suggestions response');
    return [];
  }
}

function clampImpact(value: unknown): number {
  const num = Number(value);
  if (value === undefined || value === null || isNaN(num)) return 5;
  return Math.max(2, Math.min(12, Math.round(num)));
}
