// =============================================================
// Quality Scoring Service
//
// Evaluates generated content against brand context using AI.
// Uses type-specific quality criteria from the deliverable type
// registry when available, with fallback to 4 default dimensions:
//  - Brand Voice Adherence (25%), Brand Strategy Alignment (15%),
//    Engagement (35%), Clarity (25%)
//
// Scoring via resolveFeatureModel('content-quality') AI caller.
// =============================================================

import { generateAIResponse } from '@/lib/ai/exploration/ai-caller';
import { resolveFeatureModel } from '@/lib/ai/feature-models.server';
import { getDeliverableTypeById, type QualityCriterion } from '@/features/campaigns/lib/deliverable-types';
import { getRequiredInputs } from '@/features/campaigns/lib/content-type-inputs';
import { buildBrandVoiceDirective } from './brand-voice-directive';
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
  /** Nudges for missing content-type-specific inputs that would improve quality */
  nudges?: string[];
}

// ─── Constants ────────────────────────────────────────────

const DEFAULT_DIMENSIONS = [
  { name: 'Brand Voice Adherence', weight: 0.25 },
  { name: 'Brand Strategy Alignment', weight: 0.15 },
  { name: 'Engagement', weight: 0.35 },
  { name: 'Clarity', weight: 0.25 },
] as const;

const DEFAULT_SCORING_SYSTEM_PROMPT = `You are a brand content quality analyst. You evaluate marketing and brand content across four dimensions.

## SCORING DIMENSIONS

### 1. Brand Voice Adherence (0-100)
Evaluate how well the content matches the brand's personality, tone of voice, and language.
- Is the content written in the correct language as specified in the brand voice directive?
- Does the tone match the brand personality traits and spectrum positioning?
- Are "words we use" incorporated and "words we avoid" absent?
- Does the writing style match the brand's reference writing sample?
- Is the brand name used naturally (not just generic "we")?
- Does the channel-specific tone match the communication style?

### 2. Brand Strategy Alignment (0-100)
Evaluate how well the content reinforces the brand's strategic positioning.
- Are core brand values communicated or reflected?
- Does the content follow the strategic messaging hierarchy?
- Does it reinforce the brand's positioning and promise?

### 3. Engagement (0-100)
Evaluate how compelling and engaging the content is for the target audience.
- Is the opening hook strong and attention-grabbing?
- Is there a clear call-to-action?
- Is the content readable and scannable?
- Does it use active voice and direct address?
- Does it resonate with the audience's pain points and goals?

### 4. Clarity (0-100)
Evaluate the structural quality and clarity of communication.
- Is there a logical structure (intro, body, conclusion)?
- Is the content concise without filler or repetition?
- Can the reader act on the information after reading?
- Are ideas well-organized and easy to follow?

## OUTPUT FORMAT
Respond with ONLY a JSON object (no markdown fences):
{
  "brandVoiceAdherence": { "score": 82, "explanation": "..." },
  "brandStrategyAlignment": { "score": 74, "explanation": "..." },
  "engagement": { "score": 88, "explanation": "..." },
  "clarity": { "score": 80, "explanation": "..." },
  "summary": "A 1-2 sentence overall assessment"
}

Each explanation should be 1-2 sentences explaining the score. Be specific about what works and what doesn't.`;

// ─── Helpers ──────────────────────────────────────────────

/**
 * Convert a criterion name to a camelCase JSON key.
 * E.g. "Brand Alignment" → "brandAlignment"
 */
function criterionToKey(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

/**
 * Build a dynamic scoring prompt from type-specific quality criteria.
 */
function buildTypeSpecificScoringPrompt(criteria: QualityCriterion[]): string {
  const dimensionSections = criteria.map((c, i) => {
    const pct = Math.round(c.weight * 100);
    return `### ${i + 1}. ${c.name} (0-100, weight ${pct}%)\n${c.description}`;
  }).join('\n\n');

  // Build dynamic JSON output keys from criteria names
  const jsonKeys = criteria.map(c => {
    const key = criterionToKey(c.name);
    return `  "${key}": { "score": 82, "explanation": "..." }`;
  }).join(',\n');

  return `You are a brand content quality analyst. You evaluate marketing and brand content across the following dimensions.

## SCORING DIMENSIONS

${dimensionSections}

## OUTPUT FORMAT
Respond with ONLY a JSON object (no markdown fences):
{
${jsonKeys},
  "summary": "A 1-2 sentence overall assessment"
}

Each explanation should be 1-2 sentences explaining the score. Be specific about what works and what doesn't.`;
}

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
  deliverableTypeId?: string,
  contentTypeInputs?: Record<string, unknown>,
): Promise<QualityScoringResult> {
  // Look up type-specific criteria if deliverableTypeId provided
  const typeDefinition = deliverableTypeId ? getDeliverableTypeById(deliverableTypeId) : undefined;
  const typeSpecificCriteria = typeDefinition?.qualityCriteria;

  if (!content || content.trim().length < 50) {
    return createEmptyResult(typeSpecificCriteria);
  }

  // Build brand voice directive for voice-aware scoring
  const voiceDirective = workspaceId
    ? await buildBrandVoiceDirective(workspaceId, { deliverableTypeId })
    : '';

  const userPrompt = buildScoringUserPrompt(content, context, contentType, deliverableTitle);

  try {
    const { provider, model } = workspaceId
      ? await resolveFeatureModel(workspaceId, 'content-quality')
      : { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929' };

    // Use type-specific prompt and parser if criteria available
    const baseScoringPrompt = typeSpecificCriteria && typeSpecificCriteria.length > 0
      ? buildTypeSpecificScoringPrompt(typeSpecificCriteria)
      : DEFAULT_SCORING_SYSTEM_PROMPT;
    const systemPrompt = voiceDirective
      ? `${voiceDirective}\n\n${baseScoringPrompt}`
      : baseScoringPrompt;

    const response = await generateAIResponse(
      provider,
      model,
      systemPrompt,
      userPrompt,
      0.3,
      2000,
    );

    const result = typeSpecificCriteria && typeSpecificCriteria.length > 0
      ? parseTypeSpecificResponse(response, typeSpecificCriteria)
      : parseScoringResponse(response);

    // Add nudges for missing content-type-specific inputs
    const nudges = getMissingInputNudges(deliverableTypeId, contentTypeInputs);
    if (nudges.length > 0) result.nudges = nudges;

    return result;
  } catch (error) {
    console.error('Quality scoring AI call failed:', error);
    return createEmptyResult(typeSpecificCriteria);
  }
}

// ─── Parsers ──────────────────────────────────────────────

/**
 * Parse type-specific AI scoring response with dynamic criteria.
 */
function parseTypeSpecificResponse(raw: string, criteria: QualityCriterion[]): QualityScoringResult {
  try {
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned) as Record<string, { score?: number; explanation?: string } | string>;

    const dimensions: QualityDimension[] = criteria.map(c => {
      const key = criterionToKey(c.name);
      const dimData = parsed[key] as { score?: number; explanation?: string } | undefined;
      return {
        name: c.name,
        score: clampScore(dimData?.score),
        weight: c.weight,
        explanation: dimData?.explanation || '',
      };
    });

    const overall = Math.round(
      dimensions.reduce((sum, d) => sum + d.score * d.weight, 0),
    );

    return {
      overall,
      dimensions,
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    };
  } catch {
    console.error('Failed to parse type-specific quality scoring response');
    return createEmptyResult(criteria);
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
      brandVoiceAdherence?: { score?: number; explanation?: string };
      brandStrategyAlignment?: { score?: number; explanation?: string };
      engagement?: { score?: number; explanation?: string };
      clarity?: { score?: number; explanation?: string };
      summary?: string;
    };

    const dimensions: QualityDimension[] = [
      {
        name: 'Brand Voice Adherence',
        score: clampScore(parsed.brandVoiceAdherence?.score),
        weight: 0.25,
        explanation: parsed.brandVoiceAdherence?.explanation || '',
      },
      {
        name: 'Brand Strategy Alignment',
        score: clampScore(parsed.brandStrategyAlignment?.score),
        weight: 0.15,
        explanation: parsed.brandStrategyAlignment?.explanation || '',
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
        weight: 0.25,
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

/**
 * Check for missing required content-type-specific inputs and generate nudge messages.
 */
function getMissingInputNudges(typeId: string | undefined, inputs?: Record<string, unknown>): string[] {
  if (!typeId) return [];
  const required = getRequiredInputs(typeId);
  if (required.length === 0) return [];
  const safeInputs = inputs ?? {};
  return required
    .filter((f) => {
      const val = safeInputs[f.key];
      if (val == null || val === '') return true;
      // Boolean false is a valid explicit answer, not "missing"
      if (f.type === 'boolean') return val == null;
      if (Array.isArray(val) && val.length === 0) return true;
      return false;
    })
    .map((f) => {
      const categoryHint = f.category === 'seo' ? 'for better SEO ranking'
        : f.category === 'campaign-details' ? 'to make the content actionable'
        : f.category === 'references' ? 'to add credibility'
        : f.category === 'format-specs' ? 'for correct formatting'
        : f.category === 'audience' ? 'for better targeting'
        : f.category === 'creative-direction' ? 'to guide the creative direction'
        : 'to improve content specificity';
      return `Add ${f.label.toLowerCase()} ${categoryHint}`;
    });
}

function createEmptyResult(criteria?: QualityCriterion[]): QualityScoringResult {
  const dims = criteria && criteria.length > 0
    ? criteria.map(c => ({
        name: c.name,
        score: 0,
        weight: c.weight,
        explanation: 'No content to evaluate.',
      }))
    : DEFAULT_DIMENSIONS.map(d => ({
        name: d.name,
        score: 0,
        weight: d.weight,
        explanation: 'No content to evaluate.',
      }));

  return {
    overall: 0,
    dimensions: dims,
    summary: 'No content available for scoring.',
  };
}
