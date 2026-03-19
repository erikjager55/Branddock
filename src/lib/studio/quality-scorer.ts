// =============================================================
// Quality Scoring Service
//
// Evaluates generated content against brand context using AI.
// Scores across 3 dimensions:
//  - Brand Alignment (35%): voice, values, messaging hierarchy
//  - Engagement (35%): hook, CTA, readability, emotional resonance
//  - Clarity (30%): structure, conciseness, actionability
//
// Uses Claude Sonnet 4.5 for analysis via the existing ai-caller.
// =============================================================

import { generateAIResponse } from '@/lib/ai/exploration/ai-caller';
import { resolveFeatureModel } from '@/lib/ai/feature-models.server';
import type { GenerationContext } from './context-builder';

// ─── Types ─────────────────────────────────────────────────

export interface QualityDimension {
  name: string;
  score: number;
  weight: number;
  explanation: string;
}

export interface QualityScoringResult {
  overall: number;
  dimensions: QualityDimension[];
  summary: string;
}

// ─── Constants ────────────────────────────────────────────

const DIMENSIONS = [
  { name: 'Brand Alignment', weight: 0.35 },
  { name: 'Engagement', weight: 0.35 },
  { name: 'Clarity', weight: 0.30 },
] as const;

const SCORING_SYSTEM_PROMPT = `You are a brand content quality analyst. You evaluate marketing and brand content across three dimensions.

## SCORING DIMENSIONS

### 1. Brand Alignment (0-100)
Evaluate how well the content aligns with the brand's voice, personality, values, and messaging hierarchy.
- Does the tone match the brand personality?
- Are core brand values communicated or reflected?
- Does the content follow the strategic messaging hierarchy?
- Is brand-specific terminology used consistently?
- Does it reinforce the brand's positioning and promise?

### 2. Engagement (0-100)
Evaluate how compelling and engaging the content is for the target audience.
- Is the opening hook strong and attention-grabbing?
- Is there a clear call-to-action?
- Is the content readable and scannable?
- Does it use active voice and direct address?
- Does it resonate with the audience's pain points and goals?

### 3. Clarity (0-100)
Evaluate the structural quality and clarity of communication.
- Is there a logical structure (intro, body, conclusion)?
- Is the content concise without filler or repetition?
- Can the reader act on the information after reading?
- Are ideas well-organized and easy to follow?

## OUTPUT FORMAT
Respond with ONLY a JSON object (no markdown fences):
{
  "brandAlignment": { "score": 82, "explanation": "..." },
  "engagement": { "score": 74, "explanation": "..." },
  "clarity": { "score": 88, "explanation": "..." },
  "summary": "A 1-2 sentence overall assessment"
}

Each explanation should be 1-2 sentences explaining the score. Be specific about what works and what doesn't.`;

// ─── Public API ────────────────────────────────────────────

/**
 * Score generated content quality using AI analysis.
 * Returns per-dimension scores and a weighted overall score.
 */
export async function scoreContentQuality(
  content: string,
  context: GenerationContext,
  contentType: string,
  deliverableTitle: string,
  workspaceId?: string,
): Promise<QualityScoringResult> {
  if (!content || content.trim().length < 50) {
    return createEmptyResult();
  }

  const userPrompt = buildScoringUserPrompt(content, context, contentType, deliverableTitle);

  try {
    const { provider, model } = workspaceId
      ? await resolveFeatureModel(workspaceId, 'content-quality')
      : { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929' };

    const response = await generateAIResponse(
      provider,
      model,
      SCORING_SYSTEM_PROMPT,
      userPrompt,
      0.3,
      2000,
    );

    return parseScoringResponse(response);
  } catch (error) {
    console.error('Quality scoring AI call failed:', error);
    return createEmptyResult();
  }
}

// ─── Helpers ──────────────────────────────────────────────

function buildScoringUserPrompt(
  content: string,
  context: GenerationContext,
  contentType: string,
  deliverableTitle: string,
): string {
  const parts: string[] = [];

  if (context.brandContext) {
    parts.push(context.brandContext);
    parts.push('');
  }

  if (context.personaContext) {
    parts.push(context.personaContext);
    parts.push('');
  }

  parts.push(`## CONTENT TO EVALUATE`);
  parts.push(`Type: ${contentType}`);
  parts.push(`Title: ${deliverableTitle}`);
  parts.push('');
  parts.push(content);

  return parts.join('\n');
}

function parseScoringResponse(raw: string): QualityScoringResult {
  try {
    // Strip markdown fences if present
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned) as {
      brandAlignment?: { score?: number; explanation?: string };
      engagement?: { score?: number; explanation?: string };
      clarity?: { score?: number; explanation?: string };
      summary?: string;
    };

    const dimensions: QualityDimension[] = [
      {
        name: 'Brand Alignment',
        score: clampScore(parsed.brandAlignment?.score),
        weight: 0.35,
        explanation: parsed.brandAlignment?.explanation || '',
      },
      {
        name: 'Engagement',
        score: clampScore(parsed.engagement?.score),
        weight: 0.35,
        explanation: parsed.engagement?.explanation || '',
      },
      {
        name: 'Clarity',
        score: clampScore(parsed.clarity?.score),
        weight: 0.30,
        explanation: parsed.clarity?.explanation || '',
      },
    ];

    const overall = Math.round(
      dimensions.reduce((sum, d) => sum + d.score * d.weight, 0),
    );

    return {
      overall,
      dimensions,
      summary: parsed.summary || '',
    };
  } catch {
    console.error('Failed to parse quality scoring response');
    return createEmptyResult();
  }
}

function clampScore(score: number | undefined): number {
  if (score === undefined || isNaN(score)) return 50;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function createEmptyResult(): QualityScoringResult {
  return {
    overall: 0,
    dimensions: DIMENSIONS.map((d) => ({
      name: d.name,
      score: 0,
      weight: d.weight,
      explanation: 'No content to evaluate.',
    })),
    summary: 'No content available for scoring.',
  };
}
