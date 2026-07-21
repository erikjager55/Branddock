/**
 * Fidelity-scorer — orchestrator voor content-fidelity scoring.
 *
 * Cat 6 + Phase 4 — leerlus-werkstroom.
 *
 * Strategy:
 * 1. Resolve fidelity-config voor het content-type (criteria + pillars + weights)
 * 2. Run deterministic rules voor `source: 'deterministic'` sub-criteria
 * 3. Eén AI-judge call dekt alle `source: 'ai-judge'` sub-criteria tegelijk
 * 4. Compose pillar-scores via gewogen sum
 * 5. Compute composite-score
 * 6. Persist `ContentFidelityScore` record
 *
 * Hookt aan bij `AICallTrace` via tracking-parameter zodat de judge-call
 * traceable is via `judgeCallTraceId` op het score-record.
 */

import { prisma } from "@/lib/prisma";
import { createClaudeStructuredCompletion } from "@/lib/ai/exploration/ai-caller";
import { getBrandContext } from "@/lib/ai/brand-context";
import { formatBrandContextTier } from "@/lib/ai/prompt-templates";

import {
  getFidelityConfig,
  FIDELITY_PILLAR_KEYS,
} from "@/features/campaigns/lib/fidelity-criteria";
import type {
  AICallPayload,
  FidelityCriterionDefinition,
  FidelityPillarKey,
  PillarScores,
  RuleViolation,
  SubCriteriaScores,
} from "@/types/learning-loop";

import { runDeterministicRule, DETERMINISTIC_CRITERIA } from "./fidelity-rules";
import { tryTrackStart, tryTrackComplete } from "./track-helpers";
import { emitLearningEvent } from "./event-emitter";

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

export interface ScoreContentFidelityInput {
  contentVersionId: string;
  workspaceId: string;
  /** Custom judge label voor multi-judge analyses. Default 'claude-judge-fidelity'. */
  judgeIdentifier?: string;
}

export interface ScoreContentFidelityResult {
  scoreId: string;
  contentVersionId: string;
  compositeScore: number;
  thresholdMet: boolean;
}

// ─────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────

/**
 * Score een ContentVersion volgens de fidelity-criteria voor zijn type.
 * Persisted een nieuwe `ContentFidelityScore`-row (1:N relatie ondersteunt
 * multi-judge — meerdere scores per ContentVersion zijn toegestaan).
 *
 * Gooit als ContentVersion niet gevonden is of niet bij workspace hoort.
 */
export async function scoreContentFidelity(
  input: ScoreContentFidelityInput,
): Promise<ScoreContentFidelityResult> {
  const { contentVersionId, workspaceId, judgeIdentifier = "claude-judge-fidelity" } = input;

  // 1. Load ContentVersion + Deliverable
  const version = await prisma.contentVersion.findFirst({
    where: {
      id: contentVersionId,
      deliverable: { campaign: { workspaceId } },
    },
    include: {
      deliverable: {
        select: {
          id: true,
          contentType: true,
          settings: true,
        },
      },
    },
  });

  if (!version) {
    throw new Error(`ContentVersion ${contentVersionId} not found in workspace`);
  }

  // 2. Resolve fidelity-config
  const config = getFidelityConfig(version.deliverable.contentType);

  // 3. Extract content text
  const content = extractText(version.contentSnapshot);
  if (!content || content.trim().length < 30) {
    throw new Error(`ContentVersion ${contentVersionId} has insufficient content`);
  }

  // 4. Build rule-context
  const settings = (version.deliverable.settings ?? {}) as {
    contentTypeInputs?: Record<string, unknown>;
  };
  const ruleCtx = {
    content,
    deliverableTypeId: version.deliverable.contentType,
    contentTypeInputs: settings.contentTypeInputs,
  };

  // 5. Run deterministic rules + AI-judge in parallel
  const deterministicScores = runDeterministicCriteria(config.criteria, ruleCtx);
  const aiJudgeOutcome = await runAiJudge(
    config.criteria.filter((c) => c.source === "ai-judge"),
    content,
    workspaceId,
    version.deliverable.contentType,
    contentVersionId,
  );
  const aiJudgeScores = aiJudgeOutcome.scores;

  // 6. Compose subCriteriaScores object
  const subCriteriaScores: SubCriteriaScores = {};
  const allViolations: RuleViolation[] = [];

  for (const crit of config.criteria) {
    if (crit.source === "deterministic" && deterministicScores[crit.key]) {
      const r = deterministicScores[crit.key];
      subCriteriaScores[crit.key] = {
        score: r.score,
        pillar: crit.pillar,
        source: "deterministic",
        rationale: r.rationale,
      };
      allViolations.push(...r.violations);
    } else if (crit.source === "ai-judge" && aiJudgeScores[crit.key]) {
      const r = aiJudgeScores[crit.key];
      subCriteriaScores[crit.key] = {
        score: r.score,
        pillar: crit.pillar,
        source: "ai-judge",
        rationale: r.rationale,
      };
    } else {
      // Fallback: criterion not scored (no rule + AI-judge failed)
      subCriteriaScores[crit.key] = {
        score: 50,
        pillar: crit.pillar,
        source: crit.source,
        rationale: "Score unavailable — fallback to neutral",
      };
    }
  }

  // 7. Compose pillar scores (weighted within pillar)
  const pillarScores: PillarScores = composePillarScores(config.criteria, subCriteriaScores);

  // 8. Composite score (weighted across pillars)
  const compositeScore = config.pillars.reduce((sum, p) => {
    return sum + pillarScores[p.key].score * p.weight;
  }, 0);

  const thresholdMet = compositeScore >= config.compositeThreshold;

  // 9. Persist
  const score = await prisma.contentFidelityScore.create({
    data: {
      workspaceId,
      contentVersionId,
      judgeIdentifier,
      judgeCallTraceId: aiJudgeOutcome.judgeCallTraceId,
      compositeScore: Math.round(compositeScore * 10) / 10,
      pillarScores: pillarScores as object,
      subCriteriaScores: subCriteriaScores as object,
      ruleViolations: allViolations as object,
      thresholdMet,
      scorerVersion: "v0-2026-05-06",
    },
    select: { id: true, compositeScore: true, thresholdMet: true },
  });

  // Emit fidelity.scored event so the unified event-log captures every
  // scoring run regardless of the call entry-point (rescore route,
  // canvas-orchestrator hook, smoke test, etc.).
  void emitLearningEvent({
    workspaceId,
    payload: {
      type: "fidelity.scored",
      data: {
        contentVersionId,
        scoreId: score.id,
        compositeScore: score.compositeScore,
        thresholdMet: score.thresholdMet,
        judgeIdentifier,
      },
    },
  });

  return {
    scoreId: score.id,
    contentVersionId,
    compositeScore: score.compositeScore,
    thresholdMet: score.thresholdMet,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Internals
// ─────────────────────────────────────────────────────────────────────────

interface CriterionScore {
  score: number;
  rationale?: string;
  violations: RuleViolation[];
}

function runDeterministicCriteria(
  criteria: FidelityCriterionDefinition[],
  ctx: { content: string; deliverableTypeId?: string; contentTypeInputs?: Record<string, unknown> },
): Record<string, CriterionScore> {
  const result: Record<string, CriterionScore> = {};
  for (const crit of criteria) {
    if (crit.source !== "deterministic") continue;
    if (!DETERMINISTIC_CRITERIA.has(crit.key)) continue;
    const r = runDeterministicRule(crit.key, ctx);
    if (r) {
      result[crit.key] = {
        score: r.score,
        rationale: r.rationale,
        violations: r.violations,
      };
    }
  }
  return result;
}

interface AiJudgeResponse {
  scores: Array<{
    key: string;
    score: number;
    rationale: string;
  }>;
}

// Judge-input cap — boven deze grens stijgt de promptkost zonder dat het
// structuur-oordeel verbetert.
const JUDGE_CONTENT_CHAR_CAP = 12_000;
const TRUNCATION_MARKER =
  '[CONTENT TRUNCATED AT 12000 CHARS — score structure on the visible portion only]';

/**
 * Caps judge input at the char limit, cutting on a word boundary and
 * appending an explicit marker. Without the marker the judge sees an
 * apparently mid-sentence ending and scores the cut-off as a content defect.
 */
function capJudgeContent(content: string): string {
  if (content.length <= JUDGE_CONTENT_CHAR_CAP) return content;
  const slice = content.slice(0, JUDGE_CONTENT_CHAR_CAP);
  const lastWhitespace = Math.max(slice.lastIndexOf(' '), slice.lastIndexOf('\n'));
  // Respect the word boundary only when it costs <200 chars — pathological
  // no-whitespace content falls back to a hard cut.
  const wordSafe =
    lastWhitespace > JUDGE_CONTENT_CHAR_CAP - 200 ? slice.slice(0, lastWhitespace) : slice;
  return `${wordSafe}\n${TRUNCATION_MARKER}`;
}

async function runAiJudge(
  aiCriteria: FidelityCriterionDefinition[],
  content: string,
  workspaceId: string,
  contentType: string,
  contentVersionId: string,
): Promise<{ scores: Record<string, CriterionScore>; judgeCallTraceId: string | null }> {
  if (aiCriteria.length === 0) return { scores: {}, judgeCallTraceId: null };

  // Brand-context (medium tier — voice/personality without full asset list)
  let brandContextStr = "No brand context available.";
  let brandContextSnapshot: unknown = null;
  try {
    const brandContext = await getBrandContext(workspaceId);
    brandContextStr = formatBrandContextTier(brandContext, "medium");
    brandContextSnapshot = brandContext;
  } catch {
    // continue with empty context
  }

  const criteriaList = aiCriteria
    .map(
      (c, i) =>
        `${i + 1}. ${c.label} (${c.key}, pillar=${c.pillar}): ${c.description}`,
    )
    .join("\n");

  const systemPrompt = `You are a content fidelity analyst. You evaluate marketing content across multiple dimensions and return scores 0-100 per dimension.

## SCORING RUBRIC
- 0-30: severe failure on this dimension
- 31-50: clear weaknesses but partially functional
- 51-70: acceptable but unremarkable
- 71-85: strong execution on this dimension
- 86-100: exceptional, hard to improve

Each score must be backed by a specific rationale (1-2 sentences) citing concrete evidence from the content.

## OUTPUT
Return JSON exactly matching: { "scores": [{ "key": string, "score": number, "rationale": string }] }
Include ALL keys from the dimensions list. Do NOT add commentary.`;

  const userPrompt = `# Brand Context
${brandContextStr}

# Content to Evaluate
Type: ${contentType}

\`\`\`
${capJudgeContent(content)}
\`\`\`

# Dimensions to Score
${criteriaList}

Score each dimension 0-100. Return JSON.`;

  // Manual two-call tracking — wrapper-level tracking would write a Trace
  // but not surface the id back to us, so we manage it directly to capture
  // judgeCallTraceId on the resulting ContentFidelityScore record.
  const payload: AICallPayload = {
    model: "claude-sonnet-5",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    params: { temperature: 0.3, max_tokens: 4000 },
  };
  const traceId = await tryTrackStart(
    {
      workspaceId,
      parentEntityType: "ContentVersion",
      parentEntityId: contentVersionId,
      sourceIdentifier: "src/lib/learning-loop/fidelity-scorer.ts:runAiJudge",
      brandContext: brandContextSnapshot,
      callOrder: 0,
    },
    payload,
  );

  const startTime = Date.now();
  try {
    const response = await createClaudeStructuredCompletion<AiJudgeResponse>(
      systemPrompt,
      userPrompt,
      { temperature: 0.3, maxTokens: 4000, timeoutMs: 90_000 },
    );

    await tryTrackComplete(traceId, {
      inputTokens: 0,
      outputTokens: 0,
      stopReason: "end_turn",
      latencyMs: Date.now() - startTime,
      wasFromCache: false,
    });

    const result: Record<string, CriterionScore> = {};
    for (const item of response.scores ?? []) {
      const score = clampScore(item.score);
      result[item.key] = {
        score,
        rationale: item.rationale,
        violations: [],
      };
    }
    return { scores: result, judgeCallTraceId: traceId };
  } catch (err) {
    await tryTrackComplete(traceId, {
      inputTokens: 0,
      outputTokens: 0,
      stopReason: "error",
      latencyMs: Date.now() - startTime,
      errorCode: "AI_JUDGE_FAILED",
      errorMessage: err instanceof Error ? err.message : String(err),
      wasFromCache: false,
    });
    console.warn("[fidelity-scorer] AI-judge failed:", err instanceof Error ? err.message : err);
    return { scores: {}, judgeCallTraceId: traceId };
  }
}

function composePillarScores(
  criteria: FidelityCriterionDefinition[],
  subCriteriaScores: SubCriteriaScores,
): PillarScores {
  const result: PillarScores = {
    strategic: { score: 0, weight: 0 },
    audience: { score: 0, weight: 0 },
    execution: { score: 0, weight: 0 },
  };

  for (const pillar of FIDELITY_PILLAR_KEYS) {
    const inPillar = criteria.filter((c) => c.pillar === pillar);
    if (inPillar.length === 0) continue;

    const weightedSum = inPillar.reduce((sum, c) => {
      const sc = subCriteriaScores[c.key]?.score ?? 50;
      return sum + sc * c.weight;
    }, 0);

    // Pillar weight is set externally — caller composes composite from
    // pillarScores * pillar.weight. Here we just return the within-pillar
    // weighted score and the (placeholder) weight 1.0.
    result[pillar].score = Math.round(weightedSum * 10) / 10;
    result[pillar].weight = 1.0;
  }

  return result;
}

function extractText(snapshot: unknown): string {
  if (!snapshot) return "";
  if (typeof snapshot === "string") return snapshot;
  if (typeof snapshot === "object") {
    const obj = snapshot as Record<string, unknown>;
    // Common shapes: { text: "..." } | { content: "..." } | { html: "..." }
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.content === "string") return obj.content;
    if (typeof obj.html === "string") return obj.html.replace(/<[^>]+>/g, "");
    if (typeof obj.markdown === "string") return obj.markdown;
    // Fallback — concatenate string values
    return Object.values(obj)
      .filter((v): v is string => typeof v === "string")
      .join("\n\n");
  }
  return "";
}

function clampScore(n: unknown): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return 50;
  return Math.max(0, Math.min(100, Math.round(v)));
}
