// =============================================================
// Trend Judge — LLM-as-Judge validation
//
// Phase 5 of the trend research pipeline.
// Critically evaluates each candidate trend for:
//   - Novelty (is this genuinely new?)
//   - Growth Signal (is this accelerating?)
//   - Strategic Relevance (does this matter for the brand?)
//
// Verdicts: APPROVE, IMPROVE, REJECT
// Runs once (no recursion) to control costs.
// =============================================================

import { createGeminiStructuredCompletion } from '@/lib/ai/gemini-client';
import {
  buildJudgeSystemPrompt,
  buildJudgeUserPrompt,
} from '@/lib/ai/prompts/trend-analysis';
import type { BrandContextBlock } from '@/lib/ai/prompt-templates';
import type { SanitizedTrend } from './trend-analyzer';
import {
  calculateEvidenceStrength,
  calculateActionability,
  calculateCompositeScore,
  type TrendScores,
} from './trend-scorer';

export type JudgeVerdict = 'APPROVE' | 'IMPROVE' | 'REJECT';

interface JudgementRaw {
  trendIndex: number;
  novelty: number;
  growthSignal: number;
  strategicRelevance: number;
  specificity: number;
  verdict: string;
  reasoning?: string;
  improvedDescription?: string;
  improvedHowToUse?: string[];
  improvedTitle?: string;
}

interface JudgeResult {
  judgements: JudgementRaw[];
}

/**
 * Run the LLM-as-Judge validation on candidate trends.
 * Returns scored and filtered trends with verdicts.
 *
 * - APPROVE: trend passes quality bars, scores are applied
 * - IMPROVE: description/howToUse are replaced with judge's improvements
 * - REJECT: trend is removed from results
 */
export async function judgeTrends(
  candidates: SanitizedTrend[],
  brandContext?: BrandContextBlock,
): Promise<{
  approved: Array<SanitizedTrend & { scores: TrendScores }>;
  rejected: Array<{ title: string; reason: string }>;
  error?: string;
}> {
  if (candidates.length === 0) {
    return { approved: [], rejected: [] };
  }

  try {
    const systemPrompt = buildJudgeSystemPrompt(brandContext);

    const trendInputs = candidates.map((t, i) => ({
      index: i,
      title: t.title,
      description: t.description,
      dataPoints: t.dataPoints,
      evidenceCount: t.evidenceCount,
      howToUse: t.howToUse,
      category: t.category,
      impactLevel: t.impactLevel,
    }));

    const userPrompt = buildJudgeUserPrompt(trendInputs);

    const result = await createGeminiStructuredCompletion<JudgeResult>(
      systemPrompt,
      userPrompt,
      { temperature: 0.2, maxOutputTokens: 6000 },
    );

    if (!result?.judgements?.length) {
      // Judge failed — return all trends with partial scores as fallback
      return {
        approved: candidates.map((t) => ({
          ...t,
          scores: buildFallbackScores(t),
        })),
        rejected: [],
        error: 'Judge returned no judgements, using fallback scores',
      };
    }

    // Build a map of judgements by trend index
    const judgementMap = new Map<number, JudgementRaw>();
    for (const j of result.judgements) {
      if (typeof j.trendIndex === 'number' && j.trendIndex >= 0 && j.trendIndex < candidates.length) {
        judgementMap.set(j.trendIndex, j);
      }
    }

    const approved: Array<SanitizedTrend & { scores: TrendScores }> = [];
    const rejected: Array<{ title: string; reason: string }> = [];

    for (let i = 0; i < candidates.length; i++) {
      const trend = candidates[i];
      const judgement = judgementMap.get(i);

      if (!judgement) {
        // No judgement for this trend — include with fallback scores
        approved.push({ ...trend, scores: buildFallbackScores(trend) });
        continue;
      }

      const verdict = normalizeVerdict(judgement.verdict);

      if (verdict === 'REJECT') {
        rejected.push({
          title: trend.title,
          reason: judgement.reasoning ?? 'Did not meet quality standards',
        });
        continue;
      }

      // Apply improvements if verdict is IMPROVE
      let finalTrend = trend;
      if (verdict === 'IMPROVE') {
        finalTrend = {
          ...trend,
          title: judgement.improvedTitle && judgement.improvedTitle.length > 10
            ? judgement.improvedTitle.slice(0, 200)
            : trend.title,
          description: judgement.improvedDescription && judgement.improvedDescription.length > 20
            ? judgement.improvedDescription
            : trend.description,
          howToUse: Array.isArray(judgement.improvedHowToUse) && judgement.improvedHowToUse.length > 0
            ? judgement.improvedHowToUse.filter(Boolean).slice(0, 5)
            : trend.howToUse,
        };
      }

      // Build final scores with judge-provided AI dimensions
      const novelty = clampScore(judgement.novelty);
      const growthSignal = clampScore(judgement.growthSignal);
      const strategicRelevance = clampScore(judgement.strategicRelevance);
      const specificity = clampScore(judgement.specificity);
      const evidenceStrength = calculateEvidenceStrength(finalTrend);
      const actionability = calculateActionability(finalTrend);

      const compositeScore = calculateCompositeScore({
        novelty,
        evidenceStrength,
        growthSignal,
        actionability,
        strategicRelevance,
        specificity,
      });

      // Update relevanceScore with the composite score
      finalTrend = {
        ...finalTrend,
        relevanceScore: compositeScore,
      };

      approved.push({
        ...finalTrend,
        scores: {
          novelty,
          evidenceStrength,
          growthSignal,
          actionability,
          strategicRelevance,
          specificity,
          compositeScore,
        },
      });
    }

    return { approved, rejected };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during judge validation';
    console.warn('[TrendJudge] Validation failed, using fallback scores:', message);

    // Fallback: return all trends with partial scores
    return {
      approved: candidates.map((t) => ({
        ...t,
        scores: buildFallbackScores(t),
      })),
      rejected: [],
      error: message,
    };
  }
}

function normalizeVerdict(verdict: string): JudgeVerdict {
  const upper = verdict?.toUpperCase?.() ?? '';
  if (upper === 'APPROVE') return 'APPROVE';
  if (upper === 'IMPROVE') return 'IMPROVE';
  if (upper === 'REJECT') return 'REJECT';
  return 'IMPROVE'; // default to improve if unclear — preserve the trend but attempt improvements
}

function clampScore(value: unknown): number {
  const num = typeof value === 'number' ? value : 50;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function buildFallbackScores(trend: SanitizedTrend): TrendScores {
  const evidenceStrength = calculateEvidenceStrength(trend);
  const actionability = calculateActionability(trend);
  const novelty = 50;
  const growthSignal = 50;
  const strategicRelevance = 50;
  const specificity = 50;

  return {
    novelty,
    evidenceStrength,
    growthSignal,
    actionability,
    strategicRelevance,
    specificity,
    compositeScore: calculateCompositeScore({
      novelty,
      evidenceStrength,
      growthSignal,
      actionability,
      strategicRelevance,
      specificity,
    }),
  };
}
