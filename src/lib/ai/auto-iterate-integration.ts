// =============================================================
// Auto-iterate integration (content-test #6.B wiring).
// Glue layer tussen pure auto-iterate orchestrator (src/lib/ai/auto-iterate.ts)
// en canvas-orchestrator. Levert echte regenerate + rescore callbacks via
// Anthropic SDK + runFidelityScoring, plus per-type threshold lookup en
// BrandReviewFinding loading.
//
// Wordt aangeroepen DIRECT NA runFidelityScoringPipeline en VOOR
// persistVariants (zodat iteraties geen extra components creëren).
// =============================================================

import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { runFidelityScoring } from '@/lib/brand-fidelity/fidelity-runner';
import type { FidelityCompositionInput, FidelityCompositeResult } from '@/lib/brand-fidelity/composition-engine';
import {
  runAutoIterate,
  type AutoIterateEvent,
  type AutoIterateResult,
  type RegenerateFn,
  type RescoreFn,
} from '@/lib/ai/auto-iterate';
import type { FeedbackCompilerFinding } from '@/lib/content-test/feedback-compiler';
import { getThresholdForType, DEFAULT_FIDELITY_THRESHOLD } from '@/lib/content-test/per-type-thresholds';
import type { CanvasContextStack } from '@/lib/ai/canvas-context';
import type { AiProvider } from '@/lib/ai/feature-models';

const REWRITE_MODEL = 'claude-haiku-4-5-20251001';
const REWRITE_MAX_TOKENS = 4096;

export interface AutoIterateIntegrationInput {
  workspaceId: string;
  deliverableId: string;
  contentTypeId: string | null;
  /** F-VAL composition-input voor re-scoring (zelfde stack als initial run). */
  compositionInput: FidelityCompositionInput;
  /** Initiële F-VAL outcome (voor early-exit check + first findings). */
  initialResult: FidelityCompositeResult;
  /** Initiële tekst (eerste-variant blob). */
  initialText: string;
  /** Feature-flag: per workspace-setting of env-flag. */
  enabled: boolean;
  /** Override default 2. */
  maxIterations?: number;
  /** Stack benodigd voor regenerate-prompt context (brand-name, voice). */
  stack: CanvasContextStack;
  /** Provider used voor initial generation, doorgegeven aan tracking. */
  textModelProvider: AiProvider;
}

export interface AutoIterateIntegrationOutput {
  /** Auto-iterate result (skipped, success, exhausted, of failed). */
  result: AutoIterateResult;
  /** Events die naar canvas-orchestrator gestreamed moeten worden. */
  events: AutoIterateEvent[];
}

/**
 * Run auto-iterate integration. Async generator yields AutoIterateEvent's
 * voor canvas-orchestrator zodat ze als SSE doorgegeven worden. Returns
 * AutoIterateResult voor downstream persist-update decisions.
 */
export async function* runAutoIterateIntegration(
  input: AutoIterateIntegrationInput,
): AsyncGenerator<AutoIterateEvent, AutoIterateResult> {
  // ── Resolve per-type threshold ───────────────────────────
  const threshold = input.contentTypeId
    ? await getThresholdForType(input.workspaceId, input.contentTypeId)
    : DEFAULT_FIDELITY_THRESHOLD;

  // ── Load findings van initial F-VAL run via deliverable → fidelityScore ──
  const findings = await loadFindingsForDeliverable(input.workspaceId, input.deliverableId);

  // ── Bind regenerate callback ─────────────────────────────
  const regenerate: RegenerateFn = async ({ baselineText, promptHint }) => {
    return regenerateWithFeedback({
      baselineText,
      promptHint,
      brandName: input.stack.brand?.brandName ?? 'Brand',
      contentLanguage: input.stack.brand?.contentLanguage ?? 'nl',
    });
  };

  // ── Bind rescore callback (re-uses compositionInput) ─────
  const rescore: RescoreFn = async ({ text }) => {
    const outcome = await runFidelityScoring({
      workspaceId: input.workspaceId,
      deliverableId: input.deliverableId,
      contentTypeId: input.contentTypeId,
      contentText: text,
      stack: input.stack,
      generatorProvider: input.textModelProvider,
    });
    if (!outcome) {
      return {
        compositeScore: 0,
        scoreId: '',
        findings: [],
      };
    }
    const newFindings = await loadFindingsForDeliverable(
      input.workspaceId,
      input.deliverableId,
    );
    return {
      compositeScore: outcome.result.compositeScore,
      scoreId: '', // niet kritisch — auto-iterate gebruikt scoreId niet als key
      findings: newFindings,
      pillarScores: pillarScoresFromResult(outcome.result),
    };
  };

  // ── onIteration hook: LearningEvent log voor attribution ──
  const onIteration: Parameters<typeof runAutoIterate>[0]['onIteration'] = async (log) => {
    try {
      await prisma.learningEvent.create({
        data: {
          workspaceId: log.workspaceId,
          eventType: 'content.auto_iterated',
          entityType: 'Deliverable',
          entityId: log.deliverableId,
          data: {
            iteration: log.iteration,
            previousScore: log.previousScore,
            newScore: log.newScore,
            delta: log.newScore - log.previousScore,
            appliedTemplates: log.appliedTemplates,
            unmappedFindingsCount: log.unmappedFindingsCount,
            durationMs: log.durationMs,
          },
        },
      });
    } catch (err) {
      console.warn(
        '[auto-iterate-integration] LearningEvent log failed:',
        err instanceof Error ? err.message : err,
      );
    }
  };

  // ── Delegate naar pure orchestrator ──────────────────────
  const gen = runAutoIterate({
    workspaceId: input.workspaceId,
    deliverableId: input.deliverableId,
    threshold,
    pillarScores: pillarScoresFromResult(input.initialResult),
    findings,
    initialText: input.initialText,
    initialScore: { compositeScore: input.initialResult.compositeScore, scoreId: '' },
    enabled: input.enabled,
    maxIterations: input.maxIterations,
    regenerate,
    rescore,
    onIteration,
  });

  while (true) {
    const { value, done } = await gen.next();
    if (done) return value;
    yield value;
  }
}

// ─── Helpers ───────────────────────────────────────────────

function pillarScoresFromResult(result: FidelityCompositeResult): {
  style?: number;
  judge?: number;
  rules?: number;
} {
  return {
    style: Math.round(result.pillar1EffectiveScore ?? result.pillars.style.score),
    judge: result.pillars.judge ? Math.round(result.pillars.judge.score) : undefined,
    rules: Math.round(result.pillars.rules.score),
  };
}

async function loadFindingsForDeliverable(
  workspaceId: string,
  deliverableId: string,
): Promise<FeedbackCompilerFinding[]> {
  // Findings hangen aan ContentFidelityScore → ContentVersion → Deliverable.
  // Recent-first; cap op 20 om compiler-input behapbaar te houden.
  try {
    const rows = await prisma.brandReviewFinding.findMany({
      where: {
        workspaceId,
        fidelityScore: {
          contentVersion: { deliverableId },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        category: true,
        severity: true,
        description: true,
        suggestion: true,
      },
    });
    return rows.map((row) => ({
      category: row.category as FeedbackCompilerFinding['category'],
      severity: row.severity as FeedbackCompilerFinding['severity'],
      description: row.description,
      suggestion: row.suggestion,
    }));
  } catch (err) {
    console.warn(
      '[auto-iterate-integration] loadFindings failed:',
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}

interface RegenerateContext {
  baselineText: string;
  promptHint: string;
  brandName: string;
  contentLanguage: string;
}

async function regenerateWithFeedback({
  baselineText,
  promptHint,
  brandName,
  contentLanguage,
}: RegenerateContext): Promise<{ text: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY required for auto-iterate regenerate');
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const systemPrompt = `Je bent een senior ${contentLanguage === 'nl' ? 'Nederlands' : 'English'} content-editor voor ${brandName}. Herschrijf de tekst om de feedback te verwerken. Behoud structuur, feitelijke inhoud en ongeveer dezelfde lengte. Output alleen de herziene tekst, geen preambule of commentary.`;

  const userPrompt = `${promptHint}\n\n# Huidige tekst\n${baselineText}\n\n# Opdracht\nHerschrijf bovenstaande met de verbeterpunten verwerkt. Output alleen de herziene tekst.`;

  const stream = client.messages.stream({
    model: REWRITE_MODEL,
    max_tokens: REWRITE_MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const finalMessage = await stream.finalMessage();
  const block = finalMessage.content.find((b) => b.type === 'text');
  const text = block && 'text' in block ? block.text : '';
  if (!text.trim()) {
    throw new Error('Auto-iterate regenerate returned empty text');
  }
  return { text: text.trim() };
}
