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

// F24/F27 (audit 2026-05-13): rewrite-model = Sonnet 4.6 + thinking (legacy
// API werkt + experiment 2026-05-13 toont Sonnet 4.6 + thinking als top-
// scorer 88 vs Opus 4.7 thinking dat silently faalde door foute API-syntax).
// Sonnet 4.6 + thinking is sneller + ~5x goedkoper dan Opus 4.7 én scoort
// hoger op brand-fit voor Napking voice. Thinking-budget 4000 tokens.
const REWRITE_MODEL = 'claude-sonnet-4-6';
const REWRITE_MAX_TOKENS = 4096;
const REWRITE_THINKING_BUDGET = 4000;

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
  // F13-bis (audit 2026-05-13): voiceguide-text + voiceBaseline doorgeven
  // zodat rewriter de werkelijke voice-fingerprint ziet (writing-samples,
  // words-we-use, anti-patterns). Zonder dit kreeg de LLM een instructie
  // ("imiteer sample 1") zonder bron. Werkt voor elke workspace die een
  // BrandVoiceguide heeft; degradeert gracefully naar surface-rewrite
  // wanneer voiceguide ontbreekt.
  const voiceguideText =
    input.stack.brand?.brandVoiceguide?.trim() ||
    input.stack.brand?.voiceBaseline1Pager?.trim() ||
    null;
  const regenerate: RegenerateFn = async ({ baselineText, promptHint }) => {
    return regenerateWithFeedback({
      baselineText,
      promptHint,
      brandName: input.stack.brand?.brandName ?? 'Brand',
      contentLanguage: input.stack.brand?.contentLanguage ?? 'nl',
      voiceguideText,
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
  /**
   * F13-bis: full formatted voiceguide-text (samples + words-we-use +
   * anti-patterns + tone). Nullable wanneer workspace geen voiceguide heeft.
   * Wanneer aanwezig wordt het als anchor-block in de system-prompt
   * geïnjecteerd zodat de rewriter de werkelijke voice-fingerprint kan
   * matchen ipv enkel abstracte instructies.
   */
  voiceguideText: string | null;
}

async function regenerateWithFeedback({
  baselineText,
  promptHint,
  brandName,
  contentLanguage,
  voiceguideText,
}: RegenerateContext): Promise<{ text: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY required for auto-iterate regenerate');
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // F13 Phase B2 (audit 2026-05-13): detecteer of style of judge pijler de
  // focuspunt is via promptHint-string-match (feedback-compiler injecteert
  // deze labels). Bij style/judge-focus switchen we naar aggressive rewrite-
  // mode: AI mag structuur reorganiseren, secties splitsen, openingen
  // herschrijven. Bij rules-focus blijft surface-rewrite voldoende want
  // dat zijn lexicale fixes.
  const focusStyleOrJudge = /Style-fit|Brand-fidelity/.test(promptHint);
  const lang = contentLanguage === 'nl' ? 'Nederlands' : 'English';

  // F13-bis (audit 2026-05-13): voice-fingerprint block. Cap op 2500 chars
  // (~625 tokens) zodat de rewriter context-budget houdt voor baseline + hint.
  // Voiceguide-string van formatBrandVoiceguide is typisch 800-2000 chars.
  const voiceBlock = voiceguideText
    ? `\n\n# Brand voice fingerprint (MUST MATCH)\n${voiceguideText.length > 2500 ? voiceguideText.slice(0, 2500) + '…' : voiceguideText}`
    : '';

  const systemPrompt = focusStyleOrJudge
    ? `Je bent een senior ${lang} content-editor voor ${brandName}. STRATEGIC REWRITE-modus: je MAG structuur reorganiseren, alinea's splitsen of samenvoegen, openingsregels vervangen, en zinsritme aanpassen om de focuspunt-pijler echt te raken. Behoud alle feitelijke inhoud (cijfers, namen, claims) en ongeveer dezelfde totale lengte (±20%), maar herschrijf voice/structuur agressief waar nodig om voice-fingerprint of brand-essence beter te matchen. Output alleen de herziene tekst, geen preambule of commentary.${voiceBlock}`
    : `Je bent een senior ${lang} content-editor voor ${brandName}. Herschrijf de tekst om de feedback te verwerken. Behoud structuur, feitelijke inhoud en ongeveer dezelfde lengte. Output alleen de herziene tekst, geen preambule of commentary.${voiceBlock}`;

  // F13-bis: bij style/judge-focus expliciet refereren aan voice-fingerprint
  // block (alleen wanneer voiceguide aanwezig is) zodat de rewriter niet
  // alleen abstracte pijler-instructies leest maar concreet de samples
  // raadpleegt voor ritme/opening/woordkeuze.
  const fingerprintCue =
    focusStyleOrJudge && voiceguideText
      ? 'Studeer eerst het "Brand voice fingerprint" blok in de system-prompt: imiteer woordkeuze, zinsritme en openingsstijl van de Writing samples, gebruik termen uit "Words we use" minstens 2× per alinea, vermijd elke voorkomen uit "Words we avoid" en "Anti-patterns". Reorganiseer structuur waar dat de focuspunt-pijler verbetert. '
      : focusStyleOrJudge
        ? 'Reorganiseer structuur waar dat de focuspunt-pijler verbetert. '
        : '';
  const userPrompt = `${promptHint}\n\n# Huidige tekst\n${baselineText}\n\n# Opdracht\nHerschrijf bovenstaande met de verbeterpunten verwerkt. ${fingerprintCue}Output alleen de herziene tekst.`;

  // F24/F27: Sonnet 4.6 + thinking (legacy API werkt). Voor Opus 4.7 zou
  // nieuwe adaptive-API nodig zijn maar default is Sonnet sinds F27. Bij
  // workspace-override naar Opus 4.7 zal deze direct-SDK-call falen — dat
  // is acceptabel tot productie correct via ai-caller.ts route loopt.
  const useThinking = REWRITE_MODEL.includes('sonnet') || REWRITE_MODEL.includes('opus');
  const requestParams: Anthropic.Messages.MessageStreamParams = useThinking
    ? {
        model: REWRITE_MODEL,
        max_tokens: REWRITE_MAX_TOKENS + REWRITE_THINKING_BUDGET,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        thinking: { type: 'enabled', budget_tokens: REWRITE_THINKING_BUDGET },
      }
    : {
        model: REWRITE_MODEL,
        max_tokens: REWRITE_MAX_TOKENS,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      };
  const stream = client.messages.stream(requestParams);

  const finalMessage = await stream.finalMessage();
  const block = finalMessage.content.find((b) => b.type === 'text');
  const text = block && 'text' in block ? block.text : '';
  if (!text.trim()) {
    throw new Error('Auto-iterate regenerate returned empty text');
  }
  return { text: text.trim() };
}
