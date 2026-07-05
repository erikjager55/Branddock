// =============================================================
// Canvas Content Orchestrator (Fase B)
//
// Async generator that coordinates multi-model content generation:
//   1. Assemble context stack (Fase A)
//   2. Generate text components via Claude (structured completion)
//   3. Generate images via OpenAI DALL-E 3
//   4. Persist variants as DeliverableComponent records
//   5. Calculate publish suggestion
//
// Yields SSE events progressively so the API route can stream them.
// =============================================================

import { prisma } from '@/lib/prisma';
import { assembleCanvasContext, type CanvasContextStack, type MediumContext, type PersonaContext, type BriefContext, type ProductContext, type VisualBrief, type VisualStyleDirection } from './canvas-context';
import { VISUAL_STYLE_IMAGE_INSTRUCTIONS } from './visual-brief-prompts';
import { createStructuredCompletion } from './exploration/ai-caller';
import { resolveFeatureModel, assertProvider } from './feature-models.server';
import { getFeatureDefinition, type AiProvider } from './feature-models';
import { calculateOptimalPublishDate, type PublishSuggestion } from '@/lib/campaigns/publish-scheduler';
import { formatBrandContext, type BrandContextBlock } from './prompt-templates';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import type { JourneyPhaseContext } from '@/lib/campaigns/journey-phase';
import { getDeliverableTypeById, VIDEO_ADJACENT_TYPES } from '@/features/campaigns/lib/deliverable-types';
import { getPromptTemplate } from '@/lib/studio/prompt-templates';
import { FALLBACK_FIRST_TYPES, getComponentTemplateFallback } from './component-templates-fallback';
import { getContentTypeInputs } from '@/features/campaigns/lib/content-type-inputs';
import { getLinkedInAdFormatLabel } from '@/features/campaigns/lib/linkedin-ad-formats';
import {
  buildBrandVoiceDirectiveFromContext,
  buildVoiceSelfCheckDirective,
  getBrandVoiceStatus,
} from '@/lib/studio/brand-voice-directive';
import { buildHumanVoiceDirective } from '@/lib/studio/human-voice-directive';
import { resolveHumanVoiceMode } from '@/lib/brand-fidelity/fidelity-config';
import { logBrandLanguageMismatchIfAny } from '@/lib/i18n/detect-brand-language';
import { resolveLocaleLabel } from './locale-instruction';
import { detectAiTells } from '@/lib/brand-fidelity/ai-tell-detector';
import { generateCreativeAngles, formatAngleInstruction, type CreativeAngle } from './canvas-angle-generator';
import {
  runFidelityScoring,
  buildFidelityScoreEventPayload,
  runStrictModeIfApplicable,
  buildStrictRewriteEventPayload,
} from '@/lib/brand-fidelity/fidelity-runner';
import { scoreImageFidelity } from '@/lib/brand-fidelity/visual-fidelity-scorer';
import { isPlainTextGroup, sanitizeVariantContent } from '@/features/campaigns/lib/variant-content-sanitizer';
import { runAllPropertyEvals } from '@/lib/content-test/property-evals';
import type { PropertyEvalContext } from '@/lib/content-test/types';
import OpenAI from 'openai';

/**
 * Build PropertyEvalContext uit canvas-stack. Hergebruikt door alle variant-
 * loops zodat we niet per variant duplicate werk doen.
 */
function buildPropertyEvalContextBase(
  stack: import('./canvas-context').CanvasContextStack,
  groupType: string,
): Omit<PropertyEvalContext, 'siblingVariants' | 'groupType'> {
  const typeDef = stack.deliverableTypeId ? getDeliverableTypeById(stack.deliverableTypeId) : undefined;
  const knownEntities: string[] = [];
  if (stack.brand?.brandName) knownEntities.push(stack.brand.brandName);
  for (const p of stack.products ?? []) {
    if (p.name) knownEntities.push(p.name);
  }
  for (const persona of stack.personas ?? []) {
    if (persona.name) knownEntities.push(persona.name);
  }
  void groupType; // surface in caller, dit base-helper kent groupType niet
  return {
    expectedLanguage: stack.brand?.contentLanguage ?? 'en',
    brandName: stack.brand?.brandName ?? '',
    contentType: stack.deliverableTypeId ?? 'unknown',
    wordBounds: {
      min: typeDef?.constraints?.minWords ?? null,
      max: typeDef?.constraints?.maxWords ?? null,
    },
    // CTA can live in requiredSections OR as a required contract group with
    // a cta-suffix name (closing-cta, cta-slide) — exact 'cta' match alone
    // dropped the gate for types renamed in the fase-2 group contracts.
    requiresCTA:
      (typeDef?.constraints?.requiredSections?.some((s) => s.toLowerCase().includes('cta')) ?? false) ||
      (getComponentTemplateFallback(stack.deliverableTypeId ?? '') ?? []).some(
        (g) => g.required === true && g.type.toLowerCase().includes('cta'),
      ),
    knownEntities,
  };
}

// ─── Types ────────────────────────────────────────────────

export interface OrchestrationEvent {
  event: string;
  data: unknown;
}

export interface OrchestrationOptions {
  instruction?: string;
  regenerateGroup?: string;
  userFeedback?: string;
  additionalContextText?: string;
  mediumConfig?: Record<string, unknown>;
  seoInput?: import('./seo-pipeline.types').SeoInput;
  /** Client-side content type inputs (override DB values — user may not have saved yet) */
  contentTypeInputs?: Record<string, string | string[] | number | boolean>;
  /** Content-locale Fase 2: expliciet gekozen target-BrandLocaleProfile (per-generatie taal). */
  targetLocaleProfileId?: string;
}

interface TextComponentGroup {
  group: string;
  variants: Array<{
    content: string;
    tone?: string;
    cta?: string;
    /** Creative angle label voor deze variant (bv "Schaal & trots").
     *  Optioneel: alleen aanwezig wanneer per-angle parallel generation
     *  liep. Legacy 1-call mode laat dit null. */
    angleLabel?: string;
  }>;
}

interface ImagePromptItem {
  description: string;
  style?: string;
}

interface TextGenerationResult {
  components: TextComponentGroup[];
  imagePrompts?: ImagePromptItem[];
}

interface ImageResult {
  url: string;
  prompt: string;
}

interface ComponentTemplateItem {
  type: string;
  required?: boolean;
  maxLength?: number;
  /** When true: group is a scripted scene (markdown-rich prose with
   *  [VISUAL] cues + Caption: lines), not button-text. Drives the
   *  scripted-scene formatting override in the user-prompt — supplied
   *  by the fallback registry for video-script content types. */
  isScriptedScene?: boolean;
  [key: string]: unknown;
}

/**
 * Resolve the component template for a deliverable. Prefers the
 * MediumEnrichment row (DB-seeded per platform/format) but falls back
 * to the in-memory registry when the row is missing or has an empty
 * template — without the fallback, video-script types end up with zero
 * group instructions and the model collapses everything to a single
 * `script` group, breaking the Scene Breakdown.
 *
 * FALLBACK_FIRST_TYPES (prompt-audit 2026-06-11, fase 2) inverts that
 * precedence: for those types the registry IS the contract and a generic
 * medium row would silently strip it (tiktok-script loses
 * `isScriptedScene` to the tiktok/video row; sequences and website types
 * inherit newsletter/landing-page groups that have no slot for their
 * structure). Registry wins whenever it has an entry for the type.
 */
function resolveComponentTemplate(
  medium: { componentTemplate?: unknown[] } | null | undefined,
  contentType: string | null | undefined,
): ComponentTemplateItem[] {
  const fromFallback = (getComponentTemplateFallback(contentType) ??
    []) as ComponentTemplateItem[];
  if (contentType && FALLBACK_FIRST_TYPES.has(contentType) && fromFallback.length > 0) {
    return fromFallback;
  }
  const fromMedium = (medium?.componentTemplate ?? []) as ComponentTemplateItem[];
  if (fromMedium.length > 0) return fromMedium;
  return fromFallback;
}

// ─── OpenAI Singleton ─────────────────────────────────────

const globalForOpenAI = globalThis as unknown as {
  canvasOpenAIClient: OpenAI | undefined;
};

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');
  if (!globalForOpenAI.canvasOpenAIClient) {
    globalForOpenAI.canvasOpenAIClient = new OpenAI({ apiKey });
  }
  return globalForOpenAI.canvasOpenAIClient;
}

// ─── Main Orchestrator ────────────────────────────────────

export async function* orchestrateContentGeneration(
  deliverableId: string,
  workspaceId: string,
  options?: OrchestrationOptions,
): AsyncGenerator<OrchestrationEvent> {
  const startTime = Date.now();

  // ── Step 1: Assemble context ──────────────────────────
  const stack = await assembleCanvasContext(deliverableId, workspaceId, options?.targetLocaleProfileId);

  // Override DB contentTypeInputs with client-side values (user may not have saved yet)
  if (options?.contentTypeInputs && Object.keys(options.contentTypeInputs).length > 0) {
    stack.contentTypeInputs = options.contentTypeInputs;
  }

  yield {
    event: 'context_loaded',
    data: {
      contextStack: stack,
      brandName: stack.brand.brandName ?? 'Unknown',
      contentType: stack.deliverableTypeId ?? stack.medium?.format ?? 'unknown',
      phase: stack.journeyPhase?.phase ?? null,
      hasComponentTemplate: !!stack.medium?.componentTemplate?.length,
    },
  };

  // ── Pre-generation checkpoint-gates (sub-sprint #6.A) ─────
  // [1] validateBriefInput: minimum-input check. Block bij volledig leeg
  //     → vermijd verspilde AI-calls.
  // [2] validateContextCompleteness: brand-name required (block);
  //     persona/product + contentLanguage warn-only.
  // Accumulator gateWarningsAcc verzamelt warn-severity results voor
  // latere persistentie naar AICallTrace.gateWarnings.
  const gateWarningsAcc: import('@/lib/content-test/checkpoint-gates').GateResult[] = [];
  {
    const { validateBriefInput, validateContextCompleteness } = await import(
      '@/lib/content-test/checkpoint-gates'
    );
    const briefGate = validateBriefInput({
      objective: stack.brief?.objective ?? undefined,
      keyMessage: stack.brief?.keyMessage ?? undefined,
      toneDirection: stack.brief?.toneDirection ?? undefined,
      callToAction: stack.brief?.callToAction ?? undefined,
    });
    if (!briefGate.pass) {
      if (briefGate.severity === 'block') {
        yield {
          event: 'error',
          data: {
            message: `Vul minstens een doel (objective) óf een kernboodschap (keyMessage) in vóór generatie. ${briefGate.reasons.join(' · ')}`,
            recoverable: false,
            gate: 'brief-input',
          },
        };
        return;
      }
      gateWarningsAcc.push(briefGate);
    }
    // F2 fix (audit 2026-05-13): canvas-context.personas/products bevat
    // alleen campaign-linked items. Voor de gate-check tellen ook
    // workspace-level personas/products als fallback.
    const [wsPersonaCount, wsProductCount] = await Promise.all([
      prisma.persona.count({ where: { workspaceId } }),
      prisma.product.count({ where: { workspaceId } }),
    ]);
    const contextGate = validateContextCompleteness({
      brand: stack.brand
        ? {
            brandName: stack.brand.brandName ?? undefined,
            contentLanguage: stack.brand.contentLanguage ?? undefined,
          }
        : undefined,
      personas: stack.personas?.map((p) => ({ name: p.name ?? undefined })),
      products: stack.products?.map((p) => ({ name: p.name ?? undefined })),
      workspacePersonaCount: wsPersonaCount,
      workspaceProductCount: wsProductCount,
    });
    if (!contextGate.pass) {
      if (contextGate.severity === 'block') {
        yield {
          event: 'error',
          data: {
            message: `Pre-generation gate failed (context-completeness): ${contextGate.reasons.join(' · ')}`,
            recoverable: false,
            gate: 'context-completeness',
          },
        };
        return;
      }
      gateWarningsAcc.push(contextGate);
    }
    if (gateWarningsAcc.length > 0) {
      yield {
        event: 'gate_warnings',
        data: {
          stage: 'pre-generation',
          warnings: gateWarningsAcc.map((g) => ({ stage: g.stage, reasons: g.reasons })),
        },
      };
    }
  }

  // ── Determine component groups from template ──────────
  // Falls back to the in-memory registry for video-script types whose
  // MediumEnrichment row is missing/empty — otherwise the model gets
  // zero group instructions and collapses everything into one `script`
  // blob, breaking the Scene Breakdown + per-scene visual flow.
  const componentTemplate = resolveComponentTemplate(stack.medium, stack.deliverableTypeId);
  const textGroups = componentTemplate
    .filter((t) => t.type !== 'image' && t.type !== 'hero-image' && t.type !== 'sound')
    .map((t) => t.type);
  const hasImageComponent = componentTemplate.some(
    (t) => t.type === 'image' || t.type === 'hero-image',
  );

  // Fire-and-forget mismatch-detection — logt warn wanneer de configured
  // workspace.contentLanguage afwijkt van detected language uit brand-content.
  // 5-min cache in helper voorkomt log-spam; geen auto-override.
  // Defense-in-depth try/catch: een crash in deze guard mag generation
  // nooit blokkeren.
  try {
    logBrandLanguageMismatchIfAny(workspaceId, stack.brand.contentLanguage);
  } catch (err) {
    console.warn('[canvas-orchestrator] language-guard crashed:', (err as Error).message);
  }

  // ── Build brand voice directive (BVD) + Human Voice Directive (HVD) ─
  const bvd = buildBrandVoiceDirectiveFromContext(stack.brand, {
    deliverableTypeId: stack.deliverableTypeId ?? undefined,
  });

  // ── Brand-voice status SSE notification (content-test improvement #1) ──
  // Stuur expliciet welk niveau brand voice is toegepast zodat UI dit kan
  // tonen — voorkomt verwarring wanneer fallback wordt gebruikt zonder dat
  // gebruiker dit weet.
  const voiceStatus = getBrandVoiceStatus(stack.brand);
  yield {
    event: 'brand_voice_status',
    data: {
      level: voiceStatus.level,
      userMessage: voiceStatus.userMessage,
      isFallback: voiceStatus.isFallback,
    },
  };

  // F-VAL pijler 3: append generic anti-AI-tell layer when enabled
  const humanVoiceMode = await resolveHumanVoiceMode(workspaceId);
  const hvd =
    humanVoiceMode === 'OFF'
      ? ''
      : buildHumanVoiceDirective({ language: stack.brand.contentLanguage ?? 'en' });

  const voiceDirective = hvd ? `${bvd}\n\n${hvd}` : bvd;

  // ── Regeneration path ─────────────────────────────────
  if (options?.regenerateGroup) {
    yield* handleRegeneration(deliverableId, workspaceId, stack, options, startTime, voiceDirective);
    return;
  }

  // ── SEO Pipeline path (website types, of long-form met SEO-doel) ───
  // GEO/SEO Fase 1b: long-form draait dezelfde pipeline wanneer optimizationGoals
  // 'seo' bevat (default-aan, uitvinkbaar). Gedeelde regel: shouldRunSeoPipeline.
  const deliverableTypeId = stack.deliverableTypeId ?? '';
  const seoInput = options?.seoInput;
  // Client-form-state (options) wint, maar val terug op de DB-gepersisteerde
  // contentTypeInputs (stack) zodat een opgeslagen SEO-opt-out (optimizationGoals=[])
  // ook geldt wanneer een generatie zonder options.contentTypeInputs wordt getriggerd.
  const effectiveInputs = options?.contentTypeInputs ?? stack.contentTypeInputs;
  const { shouldRunSeoPipeline, resolveOptimizationGoals } = await import('./seo-pipeline-utils');
  if (
    seoInput &&
    shouldRunSeoPipeline(deliverableTypeId, effectiveInputs, Boolean(seoInput.primaryKeyword))
  ) {
    // GEO/SEO Fase 3 — composable stage: geef het optimization-profiel mee zodat
    // de SEO-pipeline bij seo-geo op long-form een GEO-polish toepast. Bij seo-only
    // is de lijst zonder 'geo' → gedrag byte-identiek aan vóór Fase 3.
    const optimizationGoals = resolveOptimizationGoals(effectiveInputs, deliverableTypeId);
    const { runSeoPipeline } = await import('./seo-pipeline');
    yield* runSeoPipeline(
      deliverableId,
      workspaceId,
      seoInput,
      stack,
      voiceDirective,
      deliverableTypeId,
      optimizationGoals,
    );
    return;
  }

  // ── Step 2: Generate text components (per-variant parallel calls) ──
  //
  // Architecture: instead of one Claude call returning 2 variants per group
  // (which produces near-identical variants), we do:
  //   2a. Generate 2 distinct creative angles via Gemini Flash (~$0.001)
  //   2b. Run 2 parallel Claude calls — one per angle — each producing 1
  //       variant per group. Angle is injected into the system prompt so
  //       the variant is fundamentally framed by it.
  //   2c. Merge results: variants[0] = call A, variants[1] = call B,
  //       both labeled with their angle.
  //
  // Falls back to legacy 1-call/2-variant flow if angle generation fails.
  //
  // Plan-and-Solve dispatch (content-test #5.B chain-pattern C, opt-in):
  // Wanneer contentTypeInputs.usePlanAndSolve === true AND content-type
  // categorie is 'long-form', dispatch naar runPlanAndSolveStream. Produceert
  // 1 variant met assembledContent (full markdown). Bypassed de angle-
  // generation omdat Plan-and-Solve eigen structuur-discipline heeft.
  // F29 (audit 2026-05-13): per-content-type model routing. Experimenteel
  // gemeten welk model best scoort per categorie (Social → GPT-5.4, Ads →
  // Gemini 3.1 Pro, Website → Sonnet 4.6, overige → Opus 4.7). Workspace-
  // override blijft eerste prioriteit; categorie-default tweede.
  const { resolveCanvasModelForContentType } = await import('./canvas-model-routing');
  const textModel = await resolveCanvasModelForContentType(
    workspaceId,
    stack.deliverableTypeId,
  );
  console.log(
    `[canvas-orchestrator] content-type routing: ${stack.deliverableTypeId ?? '?'} → ${textModel.provider}/${textModel.model}`,
  );

  for (const group of textGroups) {
    yield { event: 'text_generating', data: { group, status: 'generating' } };
  }

  // Dispatch check: opt-in via contentTypeInputs.usePlanAndSolve
  const usePlanAndSolve =
    stack.contentTypeInputs?.usePlanAndSolve === true ||
    stack.contentTypeInputs?.usePlanAndSolve === 'true';
  const contentTypeCategory = stack.deliverableTypeId
    ? (await import('./prompt-version-registry')).getCategoryForType(stack.deliverableTypeId)
    : null;
  const isPlanAndSolveEligible = usePlanAndSolve && contentTypeCategory === 'long-form';

  let textResult: TextGenerationResult;
  let angles: Awaited<ReturnType<typeof generateCreativeAngles>> = null;

  if (isPlanAndSolveEligible) {
    yield {
      event: 'plan_and_solve_started',
      data: { contentType: stack.deliverableTypeId },
    };
    const { runPlanAndSolveStream } = await import('./chains/plan-and-solve');
    const brief: import('./chains/plan-and-solve.types').PlanAndSolveBrief = {
      brandName: stack.brand?.brandName ?? 'Unknown',
      contentLanguage: stack.brand?.contentLanguage ?? 'en',
      contentType: stack.deliverableTypeId ?? 'blog-post',
      objective: stack.brief?.objective ?? '',
      keyMessage: stack.brief?.keyMessage ?? '',
      toneDirection: stack.brief?.toneDirection ?? '',
      callToAction: stack.brief?.callToAction ?? '',
      audienceDescription:
        stack.personas[0]?.name ?? 'algemene zakelijke doelgroep',
      seoKeyword:
        typeof stack.contentTypeInputs?.seoKeyword === 'string'
          ? stack.contentTypeInputs.seoKeyword
          : undefined,
    };

    let assembledContent: string | null = null;
    let planAndSolveError: string | null = null;
    for await (const psEvent of runPlanAndSolveStream(brief, {
      tracking: {
        workspaceId,
        parentEntityType: 'Deliverable',
        parentEntityId: deliverableId,
        brandContext: stack.brand,
      },
    })) {
      // Forward Plan-and-Solve events naar canvas-orchestrator SSE-stream
      yield { event: `ps_${psEvent.event}`, data: 'data' in psEvent ? psEvent.data : null };
      if (psEvent.event === 'assembly_complete') {
        assembledContent = psEvent.data.assembledContent;
      } else if (psEvent.event === 'error') {
        planAndSolveError = psEvent.data.message;
      }
    }

    if (assembledContent && !planAndSolveError) {
      // Map Plan-and-Solve output → TextGenerationResult shape
      textResult = {
        components: [
          {
            group: 'body',
            variants: [
              {
                content: assembledContent,
                tone: stack.brief?.toneDirection ?? undefined,
                angleLabel: 'Plan-and-Solve',
              },
            ],
          },
        ],
      };
      yield {
        event: 'plan_and_solve_complete',
        data: { wordCount: assembledContent.split(/\s+/).filter(Boolean).length },
      };
      // Skip naar property-evals + F-VAL (skip angle-based dual-call flow)
      // Door textResult te zetten met assembledContent kunnen we direct doorstromen
      // door de bestaande post-generation pipeline.
    } else {
      // Plan-and-Solve faalde — fall-back naar legacy angle-based flow.
      console.warn(
        '[canvas-orchestrator] Plan-and-Solve dispatch failed, falling back to angle-based flow:',
        planAndSolveError ?? 'no assembledContent',
      );
      angles = await generateCreativeAngles(stack, stack.deliverableTypeId ?? '');
      // Continueert in normale flow hieronder met fallback-textResult-build
      textResult = { components: [] };
    }
  } else {
    // Tree-of-Thoughts angle-generator dispatch (sub-sprint #5.B chain-pattern
    // E). Opt-in via contentTypeInputs.useToTAngles. 4-5 candidates → 3-dim
    // evaluation → top-2 met framing-diversity-constraint. Cost: ~$0.003 vs
    // ~$0.001 baseline. Graceful fallback bij failure naar generateCreativeAngles.
    const useToTAngles =
      stack.contentTypeInputs?.useToTAngles === true ||
      stack.contentTypeInputs?.useToTAngles === 'true';
    if (useToTAngles) {
      yield {
        event: 'tot_angles_started',
        data: { contentType: stack.deliverableTypeId },
      };
      const { generateCreativeAnglesToT } = await import('./chains/tree-of-thoughts-angles');
      const totResult = await generateCreativeAnglesToT(
        stack,
        stack.deliverableTypeId ?? '',
        {
          tracking: {
            workspaceId,
            parentEntityType: 'Deliverable',
            parentEntityId: deliverableId,
            brandContext: stack.brand,
          },
        },
      );
      if (totResult && totResult.selectedAngles.length === 2) {
        angles = totResult.selectedAngles;
        yield {
          event: 'tot_angles_complete',
          data: {
            candidateCount: totResult.metrics.candidateCount,
            generateLatencyMs: totResult.metrics.generateLatencyMs,
            evaluateLatencyMs: totResult.metrics.evaluateLatencyMs,
            selectedAngles: angles.map((a) => ({ label: a.label, approach: a.approach })),
          },
        };
      } else {
        // ToT failed — fallback naar legacy 2-angle direct
        console.warn(
          '[canvas-orchestrator] ToT angle-generator failed, falling back to legacy generateCreativeAngles',
        );
        angles = await generateCreativeAngles(stack, stack.deliverableTypeId ?? '');
      }
    } else {
      angles = await generateCreativeAngles(stack, stack.deliverableTypeId ?? '');
    }
    textResult = { components: [] };
  }

  // ── Checkpoint-gate [3] validateAngleDiversity (sub-sprint #6.A) ──
  // Beide angle-paths (ToT + legacy) komen hier samen. Identieke angles =
  // block → varianten worden onvermijdelijk identical. Low-diversity = warn.
  if (angles !== null) {
    const { validateAngleDiversity } = await import(
      '@/lib/content-test/checkpoint-gates'
    );
    const angleGate = validateAngleDiversity(angles);
    if (!angleGate.pass) {
      if (angleGate.severity === 'block') {
        yield {
          event: 'error',
          data: {
            message: `Angle-diversity gate failed: ${angleGate.reasons.join(' · ')}`,
            recoverable: false,
            gate: 'angle-diversity',
          },
        };
        return;
      }
      gateWarningsAcc.push(angleGate);
      yield {
        event: 'gate_warnings',
        data: {
          stage: 'angle-diversity',
          warnings: [{ stage: angleGate.stage, reasons: angleGate.reasons }],
        },
      };
    }
  }

  // Skip angle-based dual-call flow indien Plan-and-Solve textResult al heeft
  if (textResult.components.length === 0) {

  if (angles && angles.length === 2) {
    // ── Per-angle parallel generation ──
    yield {
      event: 'angles_ready',
      data: { angles: angles.map((a) => ({ label: a.label, approach: a.approach })) },
    };

    const promptPerAngle = angles.map((angle) =>
      buildCanvasPrompt(stack, stack.medium, options, voiceDirective, angle),
    );

    let parallelResults: TextGenerationResult[];
    try {
      // F30 (audit 2026-05-13): best-of-3 met emphasis-variantie verlaagde
      // composite-score van ~91 naar ~53 op blog-post in productie. Reden:
      // 3 candidates met style/judge/rules emphasis-suffixes produceerden
      // onevenwichtige outputs (sterk op één pijler, zwak op andere). Haiku-
      // ranker pikte regelmatig de onbalanced winner. Single-shot per angle
      // matched de experimentele baseline beter (91 voor Opus 4.7 blog-post).
      // Cost reductie: 6 gen calls + 2 ranking → 2 gen calls per generation.
      parallelResults = await Promise.all(
        promptPerAngle.map((p, idx) =>
          generateTextWithFallback(
            workspaceId,
            textModel.provider,
            textModel.model,
            p.systemPrompt,
            p.userPrompt,
            stack.deliverableTypeId,
            { deliverableId, brandContext: stack.brand, angleLabel: angles[idx].label },
          ),
        ),
      );
    } catch (parallelErr) {
      // Per-angle failure → fall back to legacy 1-call mode below
      console.warn(
        '[canvas-orchestrator] Per-angle generation failed, falling back to legacy:',
        (parallelErr as Error).message,
      );
      parallelResults = [];
    }

    if (parallelResults.length === 2 && parallelResults.every((r) => r?.components?.length)) {
      // Merge: groep van A.variants[0] + B.variants[0] → groep met 2 variants
      const merged = mergeAngleResults(parallelResults, angles);
      textResult = merged;
    } else {
      // F30: single-shot fallback (was best-of-3, zie F30 reden hierboven)
      const { systemPrompt, userPrompt } = buildCanvasPrompt(stack, stack.medium, options, voiceDirective);
      textResult = await generateTextWithFallback(
        workspaceId,
        textModel.provider,
        textModel.model,
        systemPrompt,
        userPrompt,
        stack.deliverableTypeId,
        { deliverableId, brandContext: stack.brand },
      );
    }
  } else {
    // ── Legacy 1-call/2-variant flow (angle generation skipped of failed) ──
    // F30: single-shot generation (was best-of-3 met emphasis, zie F30 hierboven).
    const { systemPrompt, userPrompt } = buildCanvasPrompt(stack, stack.medium, options, voiceDirective);
    textResult = await generateTextWithFallback(
      workspaceId,
      textModel.provider,
      textModel.model,
      systemPrompt,
      userPrompt,
      stack.deliverableTypeId,
      { deliverableId, brandContext: stack.brand },
    );
  }
  } // end: if (textResult.components.length === 0) — Plan-and-Solve dispatch-bypass guard

  // Validate AI response
  if (!textResult?.components || !Array.isArray(textResult.components)) {
    yield {
      event: 'error',
      data: { message: 'AI returned invalid response: missing components array', recoverable: false },
    };
    return;
  }

  const textDurationMs = Date.now() - startTime;

  // Deduplicate component groups to prevent unique constraint violations
  const seenGroups = new Set<string>();
  textResult.components = textResult.components
    .filter((component) => {
      if (!component.group || !Array.isArray(component.variants)) return false;
      const normalized = component.group.trim().toLowerCase();
      if (seenGroups.has(normalized)) return false;
      seenGroups.add(normalized);
      return true;
    })
    .map((component) => ({
      ...component,
      group: component.group.trim().toLowerCase(),
    }));

  // UX-fix 2026-05-13: auto-fix brand-name capitalization in-place vóór
  // property-evals. AI ignoreert soms "preserve original capitalization"
  // instructie; voorheen blokten property-evals met severity=block, geen
  // remedie voor user. Nu corrigeren we lowercase "napking" -> "Napking"
  // automatisch, en de check is gedegradeerd naar warn (vangnet voor
  // resterende edge-cases zoals Title-Case / ALL-CAPS).
  const brandNameForFix = stack.brand?.brandName ?? null;
  if (brandNameForFix && brandNameForFix.length >= 2) {
    const { enforceBrandNameCapitalization } = await import(
      '@/features/campaigns/lib/variant-content-sanitizer'
    );
    for (const component of textResult.components) {
      for (const variant of component.variants) {
        if (typeof variant.content === 'string') {
          variant.content = enforceBrandNameCapitalization(variant.content, brandNameForFix);
        }
        if (typeof variant.cta === 'string') {
          variant.cta = enforceBrandNameCapitalization(variant.cta, brandNameForFix);
        }
      }
    }
  }

  // ── Checkpoint-gate [4] validateVariantOutput (sub-sprint #6.A) ──
  // Per-variant length/empty checks vóór property-evals. Block bij empty
  // of <20 chars (model-output broken). Warn bij group-mismatch (te lange
  // headline, te korte body). Voorkomt onnodige F-VAL en sanitize-werk
  // bij kapotte AI-output.
  {
    const { validateVariantOutput } = await import(
      '@/lib/content-test/checkpoint-gates'
    );
    const blockingVariantFailures: string[] = [];
    for (const component of textResult.components) {
      for (let i = 0; i < component.variants.length; i++) {
        const gate = validateVariantOutput(
          { content: component.variants[i].content },
          component.group,
        );
        if (!gate.pass) {
          if (gate.severity === 'block') {
            blockingVariantFailures.push(
              `${component.group}[${i}]: ${gate.reasons.join(' · ')}`,
            );
          } else {
            gateWarningsAcc.push(gate);
          }
        }
      }
    }
    if (blockingVariantFailures.length > 0) {
      yield {
        event: 'error',
        data: {
          message: `Variant-output gate failed: ${blockingVariantFailures.join('; ')}`,
          recoverable: false,
          gate: 'variant-output',
        },
      };
      return;
    }
  }

  for (const component of textResult.components) {
    yield {
      event: 'text_complete',
      data: {
        group: component.group,
        variants: component.variants.map((v, i) => ({
          index: i,
          content: v.content,
          tone: v.tone,
          cta: v.cta ?? null,
          angleLabel: v.angleLabel ?? null,
        })),
      },
    };
  }

  // ── Step 2.4: Layer 1 generic property-evals ──────────────
  // 15 deterministic checks per variant (banned-phrases, placeholder-
  // detection, language-match, brand-name-capitalization, etc.).
  // Block-severity violations → SSE error + skip F-VAL pipeline.
  // Warn/info-severity → logged in toekomstige AICallTrace integration.
  // Sub-sprint #5.A foundation; orchestrator-niveau integration.
  {
    const baseContext = buildPropertyEvalContextBase(stack, 'body');
    const totalBlockViolations: { component: string; variantIndex: number; reason: string }[] = [];
    const aggregatedResults: import('@/lib/content-test/types').PropertyEvalResult[] = [];
    const aggregatedBlockViolations: import('@/lib/content-test/types').PropertyEvalResult[] = [];
    const aggregatedWarnings: import('@/lib/content-test/types').PropertyEvalResult[] = [];
    let totalRuntimeMs = 0;

    for (const component of textResult.components) {
      const siblingContents = component.variants.map((v) => v.content);
      for (let i = 0; i < component.variants.length; i++) {
        const variant = component.variants[i];
        const siblings = siblingContents.filter((_, idx) => idx !== i);
        const context: PropertyEvalContext = {
          ...baseContext,
          groupType: component.group,
          siblingVariants: siblings,
        };
        const evalResult = runAllPropertyEvals(variant.content, context);
        totalRuntimeMs += evalResult.runtimeMs;
        // Aggregate met per-variant attribution voor trace-persistence (F1 fix).
        for (const r of evalResult.results) {
          aggregatedResults.push({
            ...r,
            reason: `[${component.group}#${i}] ${r.reason}`,
          });
        }
        for (const w of evalResult.warnings) {
          aggregatedWarnings.push({
            ...w,
            reason: `[${component.group}#${i}] ${w.reason}`,
          });
        }
        for (const blk of evalResult.blockViolations) {
          aggregatedBlockViolations.push({
            ...blk,
            reason: `[${component.group}#${i}] ${blk.reason}`,
          });
          totalBlockViolations.push({
            component: component.group,
            variantIndex: i,
            reason: `[${blk.check}] ${blk.reason}`,
          });
        }
      }
    }

    yield {
      event: 'property_evals_complete',
      data: {
        passed: totalBlockViolations.length === 0,
        blockViolationCount: totalBlockViolations.length,
        warningCount: aggregatedWarnings.length,
        runtimeMs: Math.round(totalRuntimeMs),
        // First 3 block-violations als diagnostic in UI; rest verborgen voor brevity
        blockViolations: totalBlockViolations.slice(0, 3),
      },
    };

    // ── F1 fix (audit 2026-05-13): persist aggregated property-eval results
    // naar laatste AICallTrace voor deze deliverable. Fire-and-forget;
    // tracking-failures swallowen om generation niet te blokkeren.
    try {
      const latestTrace = await prisma.aICallTrace.findFirst({
        where: { parentEntityType: 'Deliverable', parentEntityId: deliverableId },
        orderBy: { startedAt: 'desc' },
        select: { id: true },
      });
      if (latestTrace) {
        const { tryTrackPropertyEvalResults } = await import('@/lib/learning-loop/track-helpers');
        await tryTrackPropertyEvalResults(latestTrace.id, {
          passed: aggregatedBlockViolations.length === 0,
          results: aggregatedResults,
          blockViolations: aggregatedBlockViolations,
          warnings: aggregatedWarnings,
          runtimeMs: Math.round(totalRuntimeMs),
        });
      }
    } catch (err) {
      console.warn(
        '[canvas-orchestrator] property-eval persistence failed:',
        (err as Error).message,
      );
    }

    if (totalBlockViolations.length > 0) {
      yield {
        event: 'error',
        data: {
          message: `Content failed Layer 1 quality checks (${totalBlockViolations.length} block-violations). First: ${totalBlockViolations[0].reason}`,
          recoverable: false,
        },
      };
      return;
    }
  }

  // ── Steps 2.5-2.7: F-VAL scoring pipeline ─
  // F9 fix (audit 2026-05-13): per-variant scoring i.p.v. blob over alleen
  // first-variant. Iteratie over variant-indices; events krijgen
  // variantIndex-tag zodat UI per Variant A/B aparte score kan tonen.
  // STRICT-rewrite alleen op variant 0 (primaire variant) om cost te
  // beheersen — secundaire variants krijgen alleen score, geen rewrite.
  let fidelityPipelineReturn: FidelityPipelineReturn | null = null;
  const variantCount = Math.max(
    1,
    ...textResult.components.map((c) => c.variants.length),
  );
  for (let vIdx = 0; vIdx < variantCount; vIdx++) {
    const gen = runFidelityScoringPipeline({
      deliverableId,
      workspaceId,
      textResult,
      stack,
      textModelProvider: textModel.provider,
      // STRICT alleen op variant 0; secundaire variants skip om cost te
      // halveren. Variant 0 is wat user als 'primary' ziet en op publish-flow
      // gebruikt; auto-iterate werkt ook alleen op variant 0.
      humanVoiceMode: vIdx === 0 ? humanVoiceMode : 'OFF',
      variantIndex: vIdx,
    });
    let returned: FidelityPipelineReturn | null = null;
    while (true) {
      const { value, done } = await gen.next();
      if (done) {
        returned = value;
        break;
      }
      yield value;
    }
    if (vIdx === 0) {
      // Bewaar primary variant outcome voor auto-iterate downstream.
      fidelityPipelineReturn = returned;
    }
  }

  // ── Step 2.8: Auto-iterate (sub-sprint #6.B wiring) ─
  // UX-overhaul 2026-05-13 (F8 herzien): auto-iterate is NIET meer automatisch
  // tijdens generation. User triggert via "Verbeter automatisch" CTA in canvas
  // wanneer score < threshold. Endpoint: POST /api/studio/[id]/auto-iterate/trigger.
  // Reden: opt-in geeft gebruiker controle + verklaarbaarheid; automatische
  // trigger zorgde voor verwarring ("kwam dichter bij threshold (2×)") en
  // verbrandde AI-budget op generaties die user toch handmatig zou willen
  // bekijken.
  // Override mogelijk via FEATURE_AUTO_ITERATE=true voor smoke/E2E testing.
  if (
    fidelityPipelineReturn &&
    process.env.FEATURE_AUTO_ITERATE === 'true' &&
    humanVoiceMode !== 'STRICT'
  ) {
    try {
      const { runAutoIterateIntegration } = await import(
        '@/lib/ai/auto-iterate-integration'
      );
      const iterateGen = runAutoIterateIntegration({
        workspaceId,
        deliverableId,
        contentTypeId: stack.deliverableTypeId,
        compositionInput: fidelityPipelineReturn.compositionInput,
        initialResult: fidelityPipelineReturn.initialResult,
        initialText: fidelityPipelineReturn.blobText,
        enabled: true,
        stack,
        textModelProvider: textModel.provider,
      });
      let iterateOutcome: import('@/lib/ai/auto-iterate').AutoIterateResult | null = null;
      while (true) {
        const { value, done } = await iterateGen.next();
        if (done) {
          iterateOutcome = value;
          break;
        }
        yield value as OrchestrationEvent;
      }
      if (iterateOutcome && iterateOutcome.attemptsExecuted > 0) {
        try {
          const existing = await prisma.deliverable.findUnique({
            where: { id: deliverableId },
            select: { settings: true },
          });
          const currentSettings = (existing?.settings as Record<string, unknown> | null) ?? {};
          await prisma.deliverable.update({
            where: { id: deliverableId },
            data: {
              settings: {
                ...currentSettings,
                autoIterate: {
                  attemptsExecuted: iterateOutcome.attemptsExecuted,
                  finalScore: iterateOutcome.finalScore,
                  thresholdMet: iterateOutcome.thresholdMet,
                  stopReason: iterateOutcome.stopReason,
                  finalText: iterateOutcome.finalText,
                  iterations: iterateOutcome.iterations,
                  iteratedAt: new Date().toISOString(),
                },
              },
            },
          });
        } catch (persistErr) {
          console.warn(
            '[canvas-orchestrator] auto-iterate snapshot persist failed:',
            (persistErr as Error).message,
          );
        }
      }
    } catch (err) {
      console.warn(
        '[canvas-orchestrator] auto-iterate integration failed:',
        (err as Error).message,
      );
    }
  }

  // ── Step 3: Image generation is now manual ────────────
  //
  // Images are no longer auto-generated during the orchestrator run.
  // The user selects or generates images explicitly in Step 3 (Medium)
  // of the Content Canvas, via the InsertImageModal which offers four
  // sources: Upload / Import URL / Stock Photos (Pexels) / Generate
  // Image (AI Studio flow). This keeps text generation fast (~15-30s
  // instead of ~30-60s) and gives the user control over visual choice.
  //
  // The `hasImageComponent` flag and `textResult.imagePrompts` are kept
  // for backward compatibility but no longer trigger anything server-side.
  const imageResults: Array<ImageResult | null> = [];
  const imageDurationMs = 0;

  // ── Step 4: Calculate publish suggestion ──────────────
  let publishSuggestion: PublishSuggestion | null = null;
  try {
    const deliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId },
      include: {
        campaign: {
          select: { startDate: true, endDate: true },
        },
      },
    });

    if (deliverable) {
      const existingDates = await prisma.deliverable.findMany({
        where: {
          campaignId: deliverable.campaignId,
          scheduledPublishDate: { not: null },
          id: { not: deliverableId },
        },
        select: { scheduledPublishDate: true },
      });

      const rawOptimalTimes = stack.medium?.optimalPublishTimes;
      const optimalTimes = (
        rawOptimalTimes &&
        typeof rawOptimalTimes === 'object' &&
        'dayOfWeek' in rawOptimalTimes &&
        'hourRange' in rawOptimalTimes &&
        Array.isArray((rawOptimalTimes as Record<string, unknown>).dayOfWeek) &&
        Array.isArray((rawOptimalTimes as Record<string, unknown>).hourRange)
      ) ? rawOptimalTimes as {
        dayOfWeek: number[];
        hourRange: number[];
        timezone: string;
      } : null;

      publishSuggestion = calculateOptimalPublishDate(
        { startDate: deliverable.campaign.startDate, endDate: deliverable.campaign.endDate },
        stack.journeyPhase?.phase ?? null,
        deliverable.weekInCampaign,
        optimalTimes,
        existingDates
          .map((d) => d.scheduledPublishDate)
          .filter((d): d is Date => d !== null),
      );

      if (publishSuggestion) {
        yield {
          event: 'publish_suggestion',
          data: {
            suggestedDate: publishSuggestion.date.toISOString(),
            reasoning: publishSuggestion.reasoning,
          },
        };
      }
    }
  } catch (err) {
    console.error('[canvas-orchestrator] Publish suggestion calculation failed:', err);
  }

  // ── Step 5: Persist variants ──────────────────────────
  let imageComponentIds: string[] = [];
  const expectedTextComponentCount = textResult.components.reduce(
    (sum, c) => sum + c.variants.length,
    0,
  );
  try {
    const result = await persistVariants(
      deliverableId,
      workspaceId,
      textResult,
      imageResults,
      { provider: textModel.provider, textDurationMs, imageDurationMs },
      publishSuggestion,
      stack.deliverableTypeId ?? null,
    );
    imageComponentIds = result.imageComponentIds;
    // ── Checkpoint-gate [5] absorb sanitization-warnings (sub-sprint #6.A) ──
    for (const w of result.sanitizationWarnings) gateWarningsAcc.push(w);
    // ── Checkpoint-gate [8] validatePersistenceResult (sub-sprint #6.A) ──
    // Verify deliverableId + component-count consistency. Block bij missing
    // deliverableId, warn bij component-count mismatch (partial-write).
    const { validatePersistenceResult } = await import(
      '@/lib/content-test/checkpoint-gates'
    );
    const persistenceGate = validatePersistenceResult({
      deliverableId,
      componentCount: result.textComponentCount,
      expectedComponentCount: expectedTextComponentCount,
    });
    if (!persistenceGate.pass) {
      if (persistenceGate.severity === 'block') {
        yield {
          event: 'error',
          data: {
            message: `Persistence gate failed: ${persistenceGate.reasons.join(' · ')}`,
            recoverable: true,
            gate: 'persistence-result',
          },
        };
        return;
      }
      gateWarningsAcc.push(persistenceGate);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown persistence error';
    console.error('[canvas-orchestrator] persistVariants failed:', message);
    yield {
      event: 'error',
      data: { message: `Failed to save generated content: ${message}`, recoverable: true },
    };
    return;
  }

  // ── Step 5.2: Silent auto-iterate-1 (F24, audit 2026-05-13) ──
  // Lift initial score >= 70 zonder dat user handmatig op CTA hoeft te
  // klikken. Werkt 1 silent iter af op variant 0 wanneer composite < 70.
  // F8 (auto-iterate opt-in) blijft van toepassing voor verdere iters
  // boven de 70-grens; deze flow voegt 1 onzichtbare pass toe om de
  // baseline op een acceptabel niveau te brengen.
  //
  // C11 per-group (prompt-audit 2026-06-11, fase 2): voorheen Step 2.8a,
  // vóór persistVariants. Dat was dubbel defect: (1) de rewriter kreeg de
  // volledige multi-group blob als baseline en persistte die in het langste
  // component (titel/meta/CTA dupliceerden de body in — fase 0 zette dit
  // op skip bij >1 text-group), en (2) de DB-write raakte rijen van de
  // VORIGE generatie die Step 5 daarna met deleteMany+create verving — het
  // iter-resultaat landde dus nooit in het eindresultaat. Nu draait de pass
  // ná persistVariants: kies de langste variant-0 text-group, rewrite
  // ALLEEN diens generatedContent, en schrijf variantGroup-gescoped terug
  // (gotcha 2026-05-17: nooit op een proxy-veld leunen). Vóór Step 5.5
  // zodat de ContentVersion het eindresultaat vastlegt.
  //
  // Result: variant 0 generatedContent + ContentFidelityScore worden
  // direct vervangen door iter-result; user ziet alleen het hogere
  // eindresultaat (geen banner over iter).
  const SILENT_ITER_THRESHOLD = 70;
  const silentIterEligible =
    fidelityPipelineReturn &&
    fidelityPipelineReturn.initialResult.compositeScore < SILENT_ITER_THRESHOLD &&
    humanVoiceMode !== 'STRICT' &&
    process.env.FEATURE_AUTO_ITERATE !== 'true'; // gewone flow, geen E2E/smoke override

  if (silentIterEligible && fidelityPipelineReturn) {
    try {
      // Scope-fix 2026-05-17: variantIndex: 0 + skip image/video/voiceover-
      // rows, anders kan silent-iter variant B/C/D clobberen of een non-text
      // row raken. Rows zijn hier de zojuist gepersiste variant-0 componenten
      // van DEZE generatie (Step 5 hierboven).
      const components = await prisma.deliverableComponent.findMany({
        where: {
          deliverableId,
          groupIndex: 0,
          variantIndex: 0,
          componentType: { notIn: ['image', 'video', 'voiceover'] },
          generatedContent: { not: null },
        },
        select: { id: true, variantGroup: true, generatedContent: true },
      });
      const longest = components.length > 0
        ? components.reduce((a, b) =>
            (b.generatedContent?.length ?? 0) > (a.generatedContent?.length ?? 0) ? b : a,
          )
        : null;
      if (!longest) {
        // Symmetric warn met andere skip-paden; geen yield (originele score-
        // event is al gepost door runFidelityScoringPipeline).
        console.warn('[silent-iter] skipped: no eligible component', {
          deliverableId,
          contentTypeId: stack.deliverableTypeId,
          reason: 'variant-0 leverde 0 text-componenten (niet-text deliverable)',
        });
      } else if (
        // componentTemplate is hierboven al resolved (Step "Determine
        // component groups") via resolveComponentTemplate(stack.medium,
        // stack.deliverableTypeId) — zelfde deliverable, dus herbruikbaar.
        componentTemplate.some(
          (t) => t.isScriptedScene === true && t.type === longest.variantGroup,
        )
      ) {
        // De rewriter is scene-onbewust: hij herschrijft naar gewone prose
        // en sloopt daarbij de [VISUAL:]/[B-ROLL:]/[CAPTION]-markup waar de
        // image/video-generator op draait → skip i.p.v. scene-structuur
        // verliezen (fail-safe: originele scripted scene blijft staan).
        console.warn('[silent-iter] skipped: scripted-scene group', {
          deliverableId,
          contentTypeId: stack.deliverableTypeId,
          variantGroup: longest.variantGroup,
        });
      } else {
        // Baseline = persisted content van ALLEEN de gekozen group — nooit
        // de multi-group blob (C11): rewrite-input en persist-target zijn
        // zo identiek, andere groups blijven onaangeraakt.
        const baselineText = longest.generatedContent ?? '';
        const { runAutoIterateIntegration } = await import(
          '@/lib/ai/auto-iterate-integration'
        );
        const silentGen = runAutoIterateIntegration({
          workspaceId,
          deliverableId,
          contentTypeId: stack.deliverableTypeId,
          compositionInput: fidelityPipelineReturn.compositionInput,
          initialResult: fidelityPipelineReturn.initialResult,
          initialText: baselineText,
          enabled: true,
          maxIterations: 1,
          stack,
          textModelProvider: textModel.provider,
        });
        let silentResult: import('@/lib/ai/auto-iterate').AutoIterateResult | null = null;
        while (true) {
          const { value, done } = await silentGen.next();
          if (done) {
            silentResult = value;
            break;
          }
          // F24: events bewust NIET door-yielden — silent flow voor user.
        }
        const initialCompositeScore = fidelityPipelineReturn.initialResult.compositeScore;
        if (
          silentResult &&
          silentResult.attemptsExecuted > 0 &&
          silentResult.finalScore > initialCompositeScore &&
          typeof silentResult.finalText === 'string' &&
          silentResult.finalText.trim().length > 0
        ) {
          // Don't-shrink guard: respecteer content-type minWords EN
          // relatieve shrink-floor (70% van origineel) zodat long-form niet
          // silently 50% wordt afgekapt; maxWords-cap prevents balloon-rewrites.
          const newWordCount = silentResult.finalText.trim().split(/\s+/).filter(Boolean).length;
          const typeDef = stack.deliverableTypeId
            ? getDeliverableTypeById(stack.deliverableTypeId)
            : undefined;
          if (stack.deliverableTypeId && !typeDef) {
            console.warn('[silent-iter] registry miss', {
              deliverableId,
              contentTypeId: stack.deliverableTypeId,
            });
          }
          const typeMinWords = typeDef?.constraints?.minWords ?? 50;
          const typeMaxWords = typeDef?.constraints?.maxWords ?? Infinity;
          const oldWordCount = baselineText
            .trim()
            .split(/\s+/)
            .filter(Boolean).length;
          // Floor combineert content-type minimum + relatieve shrink-guard.
          // De relatieve 70%-floor (gekozen als pragmatische balans: kortere
          // tightenings van 30% zijn typisch voor F-VAL rewrites, scherper dan
          // 50% zou de meeste accepts blokkeren) voorkomt dat een ebook
          // (minWords 5000) van 6000→4500 silently 25% verliest — absolute
          // floor (5000) zou een 5000-w rewrite accepteren maar dat is alleen
          // length-correctness, niet shrink-protection. Voor short-form waar
          // typeMinWords > 0.7×old (bv push 20 minWords op 25 oldWordCount =
          // floor 20 > 17.5) is de relatieve guard dead code — bewust trade-off.
          // Voor multi-group types geldt typeMinWords over het hele document,
          // dus een enkele group kan eronder blijven → skip (fail-safe: de
          // originele content blijft staan, structured warn maakt het zichtbaar).
          // maxWords-cap geldt alleen voor types die `maxWords` declareren;
          // types met enkel `maxChars` (bv tweet) krijgen Infinity-cap (no-op).
          const shrinkFloor = Math.max(typeMinWords, Math.floor(oldWordCount * 0.7));
          const passesFloor = newWordCount >= shrinkFloor;
          const passesCap = newWordCount <= typeMaxWords;
          if (passesFloor && passesCap) {
            // Persist UITSLUITEND naar het gekozen component: id + volledige
            // C11-scope (variantGroup van de groep, variant 0, group 0, geen
            // media-row, content non-null) in de where. updateMany i.p.v.
            // update-op-id zodat de scope-velden afgedwongen blijven; count 0
            // betekent dat de row tussentijds is veranderd → skip met warn
            // i.p.v. clobber.
            const updated = await prisma.deliverableComponent.updateMany({
              where: {
                id: longest.id,
                deliverableId,
                groupIndex: 0,
                variantIndex: 0,
                variantGroup: longest.variantGroup,
                componentType: { notIn: ['image', 'video', 'voiceover'] },
                generatedContent: { not: null },
              },
              data: {
                generatedContent: silentResult.finalText,
                iterationCount: { increment: 1 },
                version: { increment: 1 },
              },
            });
            if (updated.count === 0) {
              console.warn('[silent-iter] skipped: scoped persist matched 0 rows', {
                deliverableId,
                contentTypeId: stack.deliverableTypeId,
                componentId: longest.id,
                variantGroup: longest.variantGroup,
              });
            } else {
              // console.warn (niet .info) zodat prod log-aggregators (Vercel,
              // Datadog default surface alleen warn/error) deze accept-events zien.
              console.warn('[silent-iter] accepted', {
                deliverableId,
                variantIndex: 0,
                componentId: longest.id,
                variantGroup: longest.variantGroup,
                oldWordCount,
                newWordCount,
                shrinkFloor,
                oldScore: initialCompositeScore,
                newScore: silentResult.finalScore,
              });
              // Yield bijgewerkt fidelity_score_complete event zodat frontend
              // de nieuwe (hogere) score toont. variantIndex: 0 = primary.
              // pillarScores uit silent-iter zijn niet beschikbaar; we sturen
              // alleen compositeScore + thresholdMet update. Frontend store
              // muteert compositeScore zonder pillars te vernieuwen (volgende
              // re-fetch krijgt verse data). Yield alleen bij persistence —
              // anders zou UI nieuwe score tonen terwijl DB oude content houdt.
              const threshold = fidelityPipelineReturn.initialResult.compositeThreshold;
              yield {
                event: 'fidelity_score_complete',
                data: {
                  ...buildFidelityScoreEventPayload(fidelityPipelineReturn.initialResult),
                  compositeScore: silentResult.finalScore,
                  thresholdMet: silentResult.finalScore >= threshold,
                  variantIndex: 0,
                  silentIter: true, // signal voor telemetry / future UI
                },
              };
            }
          } else {
            // Beide guards kunnen tegelijk falen — toon ze allebei i.p.v.
            // binary picker die de andere reden verbergt.
            const reasons: string[] = [];
            if (!passesFloor) reasons.push('below_shrink_floor');
            if (!passesCap) reasons.push('above_max_words');
            console.warn(`[silent-iter] skipped: ${reasons.join(',')}`, {
              deliverableId,
              contentTypeId: stack.deliverableTypeId,
              variantGroup: longest.variantGroup,
              oldWordCount,
              newWordCount,
              shrinkFloor,
              typeMaxWords: typeMaxWords === Infinity ? null : typeMaxWords,
            });
          }
        } // end: if (silentResult accepted-guards)
      } // end: else (longest != null branch)
    } catch (silentErr) {
      console.warn(
        '[canvas-orchestrator] silent auto-iterate failed (non-blocking):',
        (silentErr as Error).message,
      );
    }
  }

  // ── Step 5.5: Create ContentVersion (F32, audit 2026-05-13) ──
  // F-VAL pipeline persist (persistContentFidelityScoreIfPossible) zoekt
  // de meest recente ContentVersion van de deliverable om de
  // ContentFidelityScore aan te koppelen. Voorheen werd vanuit
  // canvas-orchestrator géén ContentVersion gecreëerd (alleen via
  // components/generate-all route) → F-VAL scores werden silently niet
  // gepersist voor canvas-generated content. Nu maakt orchestrator een
  // ContentVersion zodra variants opgeslagen zijn, zodat F-VAL pipeline
  // verderop een version-id heeft om aan te koppelen.
  try {
    const { createContentVersion } = await import('@/lib/learning-loop/content-version');
    await createContentVersion({
      deliverableId,
      workspaceId,
      createdBy: 'AI',
    });
  } catch (versionErr) {
    console.warn(
      '[canvas-orchestrator] createContentVersion failed (non-blocking):',
      versionErr instanceof Error ? versionErr.message : versionErr,
    );
  }

  // ── Step 6: Visual fidelity scoring (G8) ─────────────
  // Score each generated image in parallel against brand visual identity
  // (deterministic color alignment + Claude vision judge). Fire-and-forget
  // would be cleaner, but we yield SSE events so the canvas UI can show
  // per-variant scores immediately rather than waiting for a refresh.
  // Total ~12-15s (the longest single judge call) since we run in parallel.
  if (imageComponentIds.length > 0) {
    yield* runVisualFidelityScoring(workspaceId, imageComponentIds);
  }

  // ── Persist gate-warnings naar AICallTrace (sub-sprint #6.A) ─
  // Verzamelde warn-severity gates → laatste AICallTrace voor deze
  // deliverable. Fire-and-forget — observability mag generatie niet
  // blokkeren. Block-severity gates zijn al via SSE error afgehandeld.
  if (gateWarningsAcc.length > 0) {
    try {
      const latestTrace = await prisma.aICallTrace.findFirst({
        where: { parentEntityType: 'Deliverable', parentEntityId: deliverableId },
        orderBy: { startedAt: 'desc' },
        select: { id: true },
      });
      if (latestTrace) {
        const { tryTrackGateWarnings } = await import(
          '@/lib/learning-loop/track-helpers'
        );
        await tryTrackGateWarnings(
          latestTrace.id,
          gateWarningsAcc.map((g) => ({
            stage: g.stage,
            severity: g.severity ?? 'warn',
            reasons: g.reasons,
          })),
        );
      }
    } catch (err) {
      console.warn(
        '[canvas-orchestrator] gateWarnings persist failed:',
        (err as Error).message,
      );
    }
  }

  // ── Emit gate-metrics + degradation-check (sub-sprint #6.A) ─
  // Per-run PostHog event + rolling-window degradation-alert. Beide
  // calls fire-and-forget; tracking-failures swallowen.
  try {
    const { emitGateRunMetrics, checkGateDegradation } = await import(
      '@/lib/content-test/gate-metrics'
    );
    await emitGateRunMetrics({
      workspaceId,
      deliverableId,
      gateWarnings: gateWarningsAcc,
    });
    await checkGateDegradation({ workspaceId });
  } catch (err) {
    console.warn(
      '[canvas-orchestrator] gate-metrics emit failed:',
      (err as Error).message,
    );
  }

  // ── Complete ──────────────────────────────────────────
  const totalDuration = Date.now() - startTime;
  const componentCount =
    textResult.components.reduce((acc, c) => acc + c.variants.length, 0) +
    imageResults.filter((r) => r !== null).length;

  // ── Iteration-nudge suggesties (content-test improvement #8) ──
  // Geef de UI concrete vervolgacties die de user kan kiezen. Cowork-stijl:
  // "wil je secties herzien / tone aanpassen / variant voor ander kanaal?"
  // Worden in UI als chips/quick-actions getoond.
  const { buildIterationNudges } = await import('@/lib/content-test/iteration-nudges');
  // UX-overhaul 2026-05-13: bepaal of score onder drempel was zodat
  // "Score automatisch verbeteren" chip kan verschijnen als opt-in entry-
  // point naast de prominente CTA in FidelityScoreBar.
  const scoreBelowThreshold = fidelityPipelineReturn
    ? fidelityPipelineReturn.initialResult.compositeScore < fidelityPipelineReturn.initialResult.compositeThreshold
    : false;
  const iterationNudges = buildIterationNudges({
    contentType: stack.deliverableTypeId,
    hasImageComponent: imageResults.some((r) => r !== null),
    scoreBelowThreshold,
  });

  yield {
    event: 'complete',
    data: {
      totalDuration,
      componentCount,
      gateWarningCount: gateWarningsAcc.length,
      iterationNudges,
    },
  };
}

// Inline-functie verplaatst naar shared util src/lib/content-test/iteration-nudges.ts
// zodat client (canvas-load persistence) en server (SSE complete event) dezelfde
// logica gebruiken (audit 2026-05-13).

// ─── Text Generation with Provider Fallback ──────────────
//
// Anthropic's Claude API has intermittent 500s (seen in production as
// `{"type":"api_error","message":"Internal server error"}` after the
// ai-caller's built-in retry loop has already exhausted). When that
// happens, fall back to the next supported provider so content
// generation doesn't fail user-visibly. Order: primary → OpenAI → Google.

const FALLBACK_MODELS: Record<AiProvider, string> = {
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-5.4',
  google: 'gemini-3.1-pro-preview',
};

// Extended-thinking budget (Anthropic). Thinking tokens count toward
// max_tokens, so call sites must add this ON TOP of the output budget —
// 5000 thinking inside a 6000 maxTokens left ~1000 net output tokens
// (prompt-audit 2026-06-11).
const THINKING_BUDGET_TOKENS = 5000;

/** Resolve maxTokens based on content type — long-form needs much more */
function resolveMaxTokens(contentType: string | null): number {
  const longForm = new Set([
    'blog-post', 'pillar-page', 'whitepaper', 'case-study', 'ebook',
    'article', 'thought-leadership', 'linkedin-article',
  ]);
  const mediumForm = new Set([
    'newsletter', 'welcome-sequence', 'nurture-sequence', 'sales-deck',
    'proposal-template', 'press-release', 'impact-report', 'career-page',
    'linkedin-newsletter',
  ]);
  if (longForm.has(contentType ?? '')) return 16000;
  if (mediumForm.has(contentType ?? '')) return 8000;
  // 2026-05-19 — video-script types now emit 6 component groups (intro-caption,
  // hook, body, cta, thumbnail, captions) × 2 variants × per-scene VISUAL +
  // B-ROLL + CAPTION pillars. Previous 4000-cap truncated Gemini output to
  // ~250 tokens of content. 8000 gives the model headroom for the full
  // schema plus its own reasoning/JSON-overhead.
  if (contentType && VIDEO_ADJACENT_TYPES.has(contentType)) return 8000;
  // 2026-05-19 — short-form bumped from 4000 → 6000. Gemini 2.5+ thinking
  // tokens count against maxOutputTokens, and rich schemas (linkedin-poll
  // context+options+follow-up; twitter-thread 7-12 tweets; carousel slides)
  // routinely truncated at 4000 with 3000+ chars of output already produced.
  // 6000 covers thinking budget + JSON overhead while keeping short-form snappy.
  return 6000;
}

/**
 * Extract de angleLabel array uit textResult, geïndexeerd op variantIndex.
 * Alle groups van dezelfde variantIndex delen één angle (parallel calls per
 * angle taggen elke variant), dus we pakken het label uit de eerste niet-lege
 * group. Returns leeg array wanneer geen labels beschikbaar (legacy 1-call
 * mode).
 */
function extractVariantAngles(textResult: TextGenerationResult): string[] {
  if (!textResult?.components?.length) return [];
  // Bepaal max variantCount over alle groups
  let maxVariants = 0;
  for (const c of textResult.components) {
    if (c.variants?.length > maxVariants) maxVariants = c.variants.length;
  }

  const labels: string[] = [];
  for (let i = 0; i < maxVariants; i++) {
    let label: string | null = null;
    for (const c of textResult.components) {
      const v = c.variants?.[i];
      if (v?.angleLabel) {
        label = v.angleLabel;
        break;
      }
    }
    // Push lege string als sentinel voor "no angle for this index" — array
    // index alignment behouden zodat UI weet welke variants WEL een label
    // hebben en welke niet.
    labels.push(label ?? '');
  }

  // Wanneer NIETS gelabeld is (legacy mode), stuur leeg array zodat we
  // settings.variantAngles helemaal niet schrijven (clean fallback).
  return labels.some((l) => l.length > 0) ? labels : [];
}

/**
 * Merge twee per-angle TextGenerationResults tot één gecombineerd resultaat
 * waar elke component group beide variants bevat (variants[0] = angle A,
 * variants[1] = angle B), beide getagd met hun angleLabel.
 *
 * Robust tegen mismatch: wanneer een group alleen in A zit (niet in B), wordt
 * de A-variant alleen toegevoegd. Voorkomt errors als Claude in één call
 * een group oversloeg.
 */
function mergeAngleResults(
  results: TextGenerationResult[],
  angles: CreativeAngle[],
): TextGenerationResult {
  const groupMap = new Map<string, TextComponentGroup>();

  for (let idx = 0; idx < results.length; idx++) {
    const result = results[idx];
    const angleLabel = angles[idx]?.label;
    if (!result?.components) continue;

    for (const component of result.components) {
      if (!component.group) continue;
      const key = component.group.trim().toLowerCase();
      const firstVariant = component.variants?.[0];
      if (!firstVariant) continue;

      const tagged = { ...firstVariant, angleLabel };

      const existing = groupMap.get(key);
      if (existing) {
        existing.variants.push(tagged);
      } else {
        groupMap.set(key, {
          group: component.group,
          variants: [tagged],
        });
      }
    }
  }

  // Merge imagePrompts from first result with content (image generation
  // happens manually now, but kept for backward compat with downstream code).
  const imagePrompts = results[0]?.imagePrompts;

  return {
    components: Array.from(groupMap.values()),
    imagePrompts,
  };
}

/**
 * Shared F-VAL scoring pipeline — extract zodat zowel de initial generation
 * als de regenerate flow het kunnen aanroepen. Yields drie SSE events:
 *
 *   1. tell_check_complete (~5ms detector signaal)
 *   2. fidelity_score_running → fidelity_score_complete | fidelity_score_skipped
 *   3. (alleen bij STRICT mode + AI_LEANING verdict) strict_rewrite_running
 *      → strict_rewrite_complete | strict_rewrite_skipped
 *
 * Non-fatal: alle stappen wrapped in try/catch met terminal events zodat
 * de UI spinners altijd clears. Geen scoring runt bij blob < 50 woorden.
 */
interface FidelityPipelineReturn {
  /** Initial F-VAL result vóór STRICT/auto-iterate. */
  initialResult: import('@/lib/brand-fidelity/composition-engine').FidelityCompositeResult;
  /** Composition-input voor re-scoring (auto-iterate hergebruikt dit). */
  compositionInput: import('@/lib/brand-fidelity/fidelity-runner').FidelityRunOutcome['compositionInput'];
  /** First-variant blob text. */
  blobText: string;
}

async function* runFidelityScoringPipeline(input: {
  deliverableId: string;
  workspaceId: string;
  textResult: TextGenerationResult;
  stack: CanvasContextStack;
  textModelProvider: AiProvider;
  humanVoiceMode: import('@prisma/client').HumanVoiceMode;
  /**
   * Welke variant-index scoren (default 0 = Variant A). F9 fix (audit
   * 2026-05-13): per-variant scoring zodat Variant A en B aparte scores
   * krijgen i.p.v. dezelfde aggregate.
   */
  variantIndex?: number;
}): AsyncGenerator<OrchestrationEvent, FidelityPipelineReturn | null> {
  const { deliverableId, workspaceId, textResult, stack, textModelProvider, humanVoiceMode } = input;
  const variantIndex = input.variantIndex ?? 0;

  const blobText = textResult.components
    .map((c) => c.variants[variantIndex]?.content ?? '')
    .filter(Boolean)
    .join('\n\n');
  const blobWordCount = blobText.split(/\s+/).filter(Boolean).length;

  if (blobWordCount < 50) return null;

  // ── Detector ──
  try {
    const tellResult = detectAiTells(blobText);
    yield {
      event: 'tell_check_complete',
      data: {
        variantIndex,
        verdict: tellResult.verdict,
        humanBaselinePosition: tellResult.humanBaselinePosition,
        scorePer1000Words: Math.round(tellResult.scorePer1000Words * 10) / 10,
        uniqueTellCount: tellResult.uniqueTellCount,
        totalMatches: tellResult.totalMatches,
        wordCount: tellResult.wordCount,
      },
    };
  } catch (tellErr) {
    console.error('[canvas-orchestrator] tell-check failed:', tellErr);
  }

  // ── Composition ──
  yield { event: 'fidelity_score_running', data: { stage: 'computing', variantIndex } };
  let fidelityErrorMessage: string | null = null;
  let fidelityOutcome: Awaited<ReturnType<typeof runFidelityScoring>> = null;
  try {
    // F33 (audit 2026-05-13): pass actualWordCount als targetWordCountOverride
    // → length-control multiplier wordt effectief 1.0 (ratio = 1.0). Canvas-
    // flow genereert sections (~200-500 woorden); content-type defaults
    // mikken op full articles wat -40% judge-penalty oplevert op valide
    // sectionele content (blog-post default = 1900 vs actual 400 → 0.6× mult).
    const actualWordCount = blobText.trim().split(/\s+/).filter(Boolean).length;
    fidelityOutcome = await runFidelityScoring({
      workspaceId,
      deliverableId,
      contentTypeId: stack.deliverableTypeId,
      contentText: blobText,
      stack,
      generatorProvider: textModelProvider,
      targetWordCountOverride: actualWordCount,
    });
  } catch (fidelityErr) {
    const message = fidelityErr instanceof Error ? fidelityErr.message : 'Unknown error';
    console.error('[canvas-orchestrator] fidelity scoring failed:', message);
    fidelityErrorMessage = message;
  }

  if (!fidelityOutcome) {
    yield {
      event: 'fidelity_score_skipped',
      data: {
        variantIndex,
        reason:
          fidelityErrorMessage ??
          'Score could not be computed (insufficient signal or runtime issue)',
      },
    };
    return null;
  }

  yield {
    event: 'fidelity_score_complete',
    data: { ...buildFidelityScoreEventPayload(fidelityOutcome.result), variantIndex },
  };

  // ── Checkpoint-gate [6] validateFidelityComposite (sub-sprint #6.A) ──
  // STRICT-mode wordt apart bepaald via humanVoiceMode; voor gate-purposes
  // beschouwen we humanVoiceMode != 'OFF' als "strict-similar" (severity
  // wordt block ipv warn bij onder-threshold).
  {
    const { validateFidelityComposite } = await import(
      '@/lib/content-test/checkpoint-gates'
    );
    const fidelityGate = validateFidelityComposite(
      { composite: fidelityOutcome.result.compositeScore },
      fidelityOutcome.result.compositeThreshold,
      humanVoiceMode !== 'OFF',
    );
    if (!fidelityGate.pass) {
      if (fidelityGate.severity === 'block') {
        yield {
          event: 'gate_blocked',
          data: {
            stage: 'fidelity-composite',
            reasons: fidelityGate.reasons,
            // Non-fatal voor flow — STRICT rewrite hieronder krijgt nog een
            // kans om score boven threshold te tillen. Geen early-return.
          },
        };
      } else {
        yield {
          event: 'gate_warnings',
          data: {
            stage: 'fidelity-composite',
            warnings: [{ stage: fidelityGate.stage, reasons: fidelityGate.reasons }],
          },
        };
      }
    }
  }

  // ── STRICT rewrite (conditional) ──
  yield { event: 'strict_rewrite_running', data: { stage: 'rewriting' } };
  let strictOutcome: Awaited<ReturnType<typeof runStrictModeIfApplicable>> = null;
  let strictErrorMessage: string | null = null;
  try {
    strictOutcome = await runStrictModeIfApplicable(
      {
        compositionInput: fidelityOutcome.compositionInput,
        deliverableId,
      },
      humanVoiceMode,
    );
  } catch (strictErr) {
    const message = strictErr instanceof Error ? strictErr.message : 'Unknown error';
    console.error('[canvas-orchestrator] STRICT mode failed:', message);
    strictErrorMessage = message;
  }

  if (strictOutcome) {
    yield {
      event: 'strict_rewrite_complete',
      data: buildStrictRewriteEventPayload(strictOutcome, strictOutcome.finalFidelityScore),
    };

    // ── Checkpoint-gate [7] validateStrictRewrite (sub-sprint #6.A) ──
    // Post-rewrite score moet > pre-rewrite. Marginal-delta (<2) warns,
    // negative-delta blocks (rewrite verlaagde score → tegenproductief).
    if (strictOutcome.finalFidelityScore) {
      const { validateStrictRewrite } = await import(
        '@/lib/content-test/checkpoint-gates'
      );
      const rewriteGate = validateStrictRewrite(
        fidelityOutcome.result.compositeScore,
        strictOutcome.finalFidelityScore.compositeScore,
      );
      if (!rewriteGate.pass) {
        yield {
          event: rewriteGate.severity === 'block' ? 'gate_blocked' : 'gate_warnings',
          data: {
            stage: 'strict-rewrite',
            reasons: rewriteGate.reasons,
            warnings:
              rewriteGate.severity === 'warn'
                ? [{ stage: rewriteGate.stage, reasons: rewriteGate.reasons }]
                : undefined,
          },
        };
      }
    }
  } else {
    yield {
      event: 'strict_rewrite_skipped',
      data: { reason: strictErrorMessage ?? 'STRICT mode not applicable for this workspace' },
    };
  }

  return {
    initialResult: fidelityOutcome.result,
    compositionInput: fidelityOutcome.compositionInput,
    blobText,
  };
}

// ─────────────────────────────────────────────────────────────
// F22b (audit 2026-05-13): best-of-N candidate-generation
// =============================================================
// Doel: initial-score >=70 zonder iter. Genereert N candidates
// parallel met emphasis-variantie in system-prompt (style /
// judge / rules focus). Eén lightweight ranking-call via Haiku
// kiest de winnaar; loser-candidates worden weggegooid (geen
// F-VAL kost). Het winning candidate gaat door de bestaande
// post-generation pipeline (full F-VAL, persist, etc.).
//
// Cost: 3x generation tokens + 1 ranking call (~$0.05). Latency
// ~hetzelfde als single-shot omdat candidates parallel zijn.
// =============================================================

const BEST_OF_N_EMPHASIS_VARIANTS = [
  // Style-focus
  '\n\n## CANDIDATE FOCUS (this generation only)\nFocus EXTRA op voice-match: imiteer ritme + openingsstijl van Writing sample [1] uit de Voice Fingerprint. Gebruik termen uit "Words we use" minimaal 2× per alinea. Match de zinslengte-variatie uit de samples.',
  // Judge-focus (brand-essence)
  '\n\n## CANDIDATE FOCUS (this generation only)\nFocus EXTRA op brand-essence: maak de key-message expliciet zichtbaar in zowel introductie als conclusie. Elk hoofdstuk moet aan de overall brand-purpose bijdragen. Gebruik consistente brand-frames (geen mix tussen contraire posities).',
  // Rules-focus
  '\n\n## CANDIDATE FOCUS (this generation only)\nFocus EXTRA op AI-tell elimination + concrete details: geen clichés ("in de wereld van vandaag", "het is belangrijk om"), elke claim met getal of zintuiglijke detail onderbouwd. Brand-name expliciet in eerste of tweede alinea.',
];

/** Extract primary text body from a generated result for ranking purposes. */
function extractPrimaryText(result: TextGenerationResult): string {
  if (!result?.components) return '';
  const allVariants = result.components.flatMap((c) =>
    Array.isArray(c.variants) ? c.variants : [],
  );
  if (allVariants.length === 0) return '';
  // Pick longest content as representative of overall quality
  return allVariants.reduce(
    (acc, v) => (typeof v.content === 'string' && v.content.length > acc.length ? v.content : acc),
    '',
  );
}

interface RankingResponse {
  winner: number;
  scores: number[];
  reasoning?: string;
}

/**
 * Rank N candidates via 1 lightweight Haiku call. Returns winning index.
 * Falls back to index 0 on failure (first candidate wins by default).
 */
async function pickBestCandidate(
  candidates: TextGenerationResult[],
  stack: CanvasContextStack,
): Promise<number> {
  if (candidates.length <= 1) return 0;
  const texts = candidates.map((c) => extractPrimaryText(c));
  if (texts.every((t) => !t.trim())) return 0;

  const brandName = stack.brand.brandName ?? 'Brand';
  const voiceguide = (stack.brand.brandVoiceguide ?? '').slice(0, 2000);
  // Fase 5 M6: real language name via the shared resolver — previously a
  // binary nl/en choice that collapsed e.g. sv/de workspaces to English.
  const lang = resolveLocaleLabel(stack.brand.contentLanguage ?? 'en')?.nativeName ?? 'English';

  const systemPrompt = `Je bent een brand-fit judge voor ${brandName}. Evalueer welke versie het beste matched bij de brand voice fingerprint. Schrijf in ${lang}.

# Brand voice fingerprint
${voiceguide}

# Taak
Hieronder ${candidates.length} versies. Score elk op 0-100 op brand-voice-match (woordkeuze + ritme + opening + brand-essence). Return JSON.`;

  const userPrompt = `${texts
    .map((t, idx) => `## Versie [${idx}]\n${t.slice(0, 1500)}`)
    .join('\n\n---\n\n')}

Return JSON: { "winner": <index>, "scores": [<score0>, <score1>, ...], "reasoning": "<korte motivatie>" }`;

  try {
    const result = await createStructuredCompletion<RankingResponse>(
      'anthropic',
      'claude-haiku-4-5-20251001',
      systemPrompt,
      userPrompt,
      { temperature: 0.3, maxTokens: 600 },
    );
    const winner = Number.isInteger(result.winner) ? result.winner : 0;
    return Math.max(0, Math.min(candidates.length - 1, winner));
  } catch (err) {
    console.warn(
      '[canvas-orchestrator] pickBestCandidate failed; using candidate 0:',
      err instanceof Error ? err.message : err,
    );
    return 0;
  }
}

/**
 * Best-of-N candidate generator. N parallel generations with system-prompt
 * emphasis-variantie + 1 ranking call to pick the winner. Falls back to
 * single-shot generateTextWithFallback if all candidates fail.
 */
async function generateBestOfNWithFallback(
  workspaceId: string,
  primaryProvider: AiProvider,
  primaryModel: string,
  basePrompt: { systemPrompt: string; userPrompt: string },
  contentType: string | null,
  tracking: { deliverableId: string; brandContext?: unknown; angleLabel?: string },
  stack: CanvasContextStack,
  n: number = 3,
): Promise<TextGenerationResult> {
  const variants = BEST_OF_N_EMPHASIS_VARIANTS.slice(0, n);
  const prompts = variants.map((emp) => ({
    systemPrompt: basePrompt.systemPrompt + emp,
    userPrompt: basePrompt.userPrompt,
  }));

  console.log(
    `[canvas-orchestrator] best-of-${variants.length} starting (${primaryProvider}/${primaryModel})${
      tracking.angleLabel ? ` for angle "${tracking.angleLabel}"` : ''
    }`,
  );

  const settled = await Promise.allSettled(
    prompts.map((p) =>
      generateTextWithFallback(
        workspaceId,
        primaryProvider,
        primaryModel,
        p.systemPrompt,
        p.userPrompt,
        contentType,
        tracking,
      ),
    ),
  );

  const valid = settled
    .map((r) => (r.status === 'fulfilled' ? r.value : null))
    .filter(
      (r): r is TextGenerationResult =>
        r !== null && Array.isArray(r.components) && r.components.length > 0,
    );

  if (valid.length === 0) {
    console.warn('[canvas-orchestrator] all best-of-N candidates failed; falling back to single-shot');
    return generateTextWithFallback(
      workspaceId,
      primaryProvider,
      primaryModel,
      basePrompt.systemPrompt,
      basePrompt.userPrompt,
      contentType,
      tracking,
    );
  }

  if (valid.length === 1) return valid[0];

  const winnerIdx = await pickBestCandidate(valid, stack);
  console.log(
    `[canvas-orchestrator] best-of-${variants.length} winner: candidate [${winnerIdx}] (focus: ${
      ['style', 'judge', 'rules'][winnerIdx] ?? 'unknown'
    })`,
  );
  return valid[winnerIdx];
}

async function generateTextWithFallback(
  workspaceId: string,
  primaryProvider: AiProvider,
  primaryModel: string,
  systemPrompt: string,
  userPrompt: string,
  contentType?: string | null,
  tracking?: { deliverableId: string; brandContext?: unknown; angleLabel?: string },
): Promise<TextGenerationResult> {
  // Build the ordered list of providers to try. Primary first, then the
  // feature's other supportedProviders (from the feature registry).
  const feature = getFeatureDefinition('canvas-text-generate');
  const supported = feature?.supportedProviders ?? ['anthropic', 'openai', 'google'];
  const ordered: AiProvider[] = [
    primaryProvider,
    ...supported.filter((p) => p !== primaryProvider),
  ];

  let lastError: unknown;
  for (let i = 0; i < ordered.length; i++) {
    const provider = ordered[i];
    const model = i === 0 ? primaryModel : FALLBACK_MODELS[provider];
    try {
      console.log(
        `[canvas-orchestrator] attempting text generation with ${provider}/${model}` +
          (i === 0 ? ' (primary)' : ' (fallback)'),
      );
      // F22/F27 (audit 2026-05-13): extended thinking voor Anthropic Sonnet
      // 4.6+/Opus 4.5+/4.7. Bij thinking-on moet temperature undefined zijn
      // (Anthropic vereiste). Niet-thinking-capable modellen blijven op
      // temperature 0.7. ai-caller.ts handelt Opus 4.7 nieuwe API af.
      const useThinking =
        provider === 'anthropic' &&
        (model.includes('sonnet-4') || model.includes('opus-4'));
      // Thinking counts toward max_tokens (Anthropic) — reserve the budget
      // on top of the output budget so net output doesn't shrink.
      const outputBudget = resolveMaxTokens(contentType ?? null);
      const callOptions: Parameters<typeof createStructuredCompletion>[4] = useThinking
        ? {
            maxTokens: outputBudget + THINKING_BUDGET_TOKENS,
            thinking: { anthropic: { budgetTokens: THINKING_BUDGET_TOKENS } },
          }
        : { temperature: 0.7, maxTokens: outputBudget };
      const result = await createStructuredCompletion<TextGenerationResult>(
        provider,
        model,
        systemPrompt,
        userPrompt,
        callOptions,
        tracking
          ? {
              workspaceId,
              parentEntityType: 'Deliverable',
              parentEntityId: tracking.deliverableId,
              brandContext: tracking.brandContext,
              callOrder: i, // 0 = primary, 1+ = fallback attempts
              sourceIdentifier: `src/lib/ai/canvas-orchestrator.ts:generateTextWithFallback:${i === 0 ? 'primary' : 'fallback'}`,
            }
          : undefined,
      );
      if (i > 0) {
        console.warn(
          `[canvas-orchestrator] recovered via fallback provider ${provider}/${model} after primary failure`,
        );
      }
      // Tag elke variant met angleLabel zodat de merge-stap ze kan
      // groeperen onder de juiste creative angle.
      if (tracking?.angleLabel && result?.components) {
        for (const c of result.components) {
          if (Array.isArray(c.variants)) {
            for (const v of c.variants) v.angleLabel = tracking.angleLabel;
          }
        }
      }
      return result;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[canvas-orchestrator] text generation failed on ${provider}/${model}:`,
        message.slice(0, 300),
      );
      // Continue to next provider
    }
  }

  // All providers failed — surface the last error
  throw lastError instanceof Error
    ? lastError
    : new Error('Text generation failed on all supported providers');
}

// ─── Regeneration Handler ─────────────────────────────────

async function* handleRegeneration(
  deliverableId: string,
  workspaceId: string,
  stack: CanvasContextStack,
  options: OrchestrationOptions,
  startTime: number,
  voiceDirective?: string,
): AsyncGenerator<OrchestrationEvent> {
  const group = options.regenerateGroup!;
  const feedback = options.userFeedback ?? '';

  const existingComponents = await prisma.deliverableComponent.findMany({
    where: { deliverableId },
    orderBy: [{ variantGroup: 'asc' }, { variantIndex: 'asc' }],
  });

  const isImageGroup = group === 'visual' || group === 'image' || group === 'hero-image';
  // Normalize image group name to match what full generation stores
  const effectiveGroup = isImageGroup ? 'visual' : group;

  if (isImageGroup) {
    // Regenerate images
    const existingImageComponents = existingComponents.filter(
      (c) => c.variantGroup === effectiveGroup,
    );
    const existingPrompts = existingImageComponents
      .map((c) => c.imagePromptUsed)
      .filter((p): p is string => !!p);

    // Build improved prompts using feedback
    const improvedPrompts = existingPrompts.length > 0
      ? existingPrompts.map(
          (p) => `${p}. Improvement based on feedback: ${feedback}`,
        )
      : [`Professional brand image. ${feedback}`];

    // Ensure we have 3 prompts
    while (improvedPrompts.length < 3) {
      improvedPrompts.push(improvedPrompts[0]);
    }

    yield { event: 'image_generating', data: { status: 'regenerating', count: improvedPrompts.length } };

    const imageStart = Date.now();
    const imageResults = await generateImages(
      improvedPrompts.slice(0, 3),
      stack.brand,
      workspaceId,
    );
    const imageDurationMs = Date.now() - imageStart;

    const successfulImages = imageResults.filter((r): r is ImageResult => r !== null);
    if (successfulImages.length > 0) {
      yield {
        event: 'image_complete',
        data: {
          variants: successfulImages.map((r, i) => ({
            index: i,
            url: r.url,
            prompt: r.prompt,
          })),
        },
      };
    } else {
      yield {
        event: 'error',
        data: { message: 'All image regenerations failed', recoverable: true },
      };
      return;
    }

    // Persist regenerated images
    let regeneratedImageComponentIds: string[] = [];
    try {
      const result = await persistRegeneratedGroup(
        deliverableId,
        workspaceId,
        effectiveGroup,
        null,
        imageResults,
        0,
        stack.deliverableTypeId ?? null,
        { provider: 'openai', durationMs: imageDurationMs },
      );
      regeneratedImageComponentIds = result.imageComponentIds;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown persistence error';
      console.error('[canvas-orchestrator] persistRegeneratedGroup (image) failed:', message);
      yield {
        event: 'error',
        data: { message: `Failed to save regenerated images: ${message}`, recoverable: true },
      };
      return;
    }

    // G8 — score the new images. Old scores still exist in the DB but are
    // tied to the deleted DeliverableComponent records (cascade); fresh
    // scores will replace them in the UI on the next page load.
    if (regeneratedImageComponentIds.length > 0) {
      yield* runVisualFidelityScoring(workspaceId, regeneratedImageComponentIds);
    }
  } else {
    // Regenerate text group
    yield { event: 'text_generating', data: { group, status: 'regenerating' } };

    const { systemPrompt, userPrompt } = buildRegenerationPrompt(
      stack,
      existingComponents,
      group,
      feedback,
      options,
      voiceDirective,
    );

    // F29: per-content-type routing ook bij regeneration path.
    const { resolveCanvasModelForContentType } = await import('./canvas-model-routing');
    const textModel = await resolveCanvasModelForContentType(
      workspaceId,
      stack.deliverableTypeId,
    );

    const textStart = Date.now();
    // F22/F27: extended thinking voor Anthropic Sonnet 4+ / Opus 4+ ook bij
    // regeneration path. ai-caller.ts handelt Opus 4.7 nieuwe API af.
    const useRegenThinking =
      textModel.provider === 'anthropic' &&
      (textModel.model.includes('sonnet-4') || textModel.model.includes('opus-4'));
    // Thinking counts toward max_tokens (Anthropic) — reserve the budget
    // on top of the output budget so net output doesn't shrink.
    const regenOutputBudget = resolveMaxTokens(stack.deliverableTypeId ?? null);
    const regenOptions: Parameters<typeof createStructuredCompletion>[4] = useRegenThinking
      ? {
          maxTokens: regenOutputBudget + THINKING_BUDGET_TOKENS,
          thinking: { anthropic: { budgetTokens: THINKING_BUDGET_TOKENS } },
        }
      : { temperature: 0.8, maxTokens: regenOutputBudget };
    const result = await createStructuredCompletion<TextGenerationResult>(
      textModel.provider,
      textModel.model,
      systemPrompt,
      userPrompt,
      regenOptions,
      {
        workspaceId,
        parentEntityType: 'Deliverable',
        parentEntityId: deliverableId,
        brandContext: stack.brand,
        sourceIdentifier: 'src/lib/ai/canvas-orchestrator.ts:handleRegeneration',
      },
    );
    const textDurationMs = Date.now() - textStart;

    if (!result?.components || !Array.isArray(result.components)) {
      yield {
        event: 'error',
        data: { message: 'AI returned invalid response during regeneration', recoverable: true },
      };
      return;
    }

    const regeneratedGroup = result.components.find(
      (c) => c.group?.trim().toLowerCase() === group.trim().toLowerCase(),
    );
    if (regeneratedGroup) {
      yield {
        event: 'text_complete',
        data: {
          group: regeneratedGroup.group,
          variants: regeneratedGroup.variants.map((v, i) => ({
            index: i,
            content: v.content,
            tone: v.tone,
          })),
        },
      };

      try {
        await persistRegeneratedGroup(
          deliverableId,
          workspaceId,
          effectiveGroup,
          regeneratedGroup,
          null,
          0,
          stack.deliverableTypeId ?? null,
          { provider: textModel.provider, durationMs: textDurationMs },
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown persistence error';
        console.error('[canvas-orchestrator] persistRegeneratedGroup (text) failed:', message);
        yield {
          event: 'error',
          data: { message: `Failed to save regenerated content: ${message}`, recoverable: true },
        };
        return;
      }

      // ── Re-run F-VAL scoring after regenerate ──
      // Fetch alle current first-variants uit DB en bouw een nieuwe textResult
      // shape voor de scoring pipeline. Anders verdwijnt de position bar
      // permanent na een regenerate (UI reset op generate-start, geen
      // herscoring → fidelity stage blijft 'idle' na regenerate-complete).
      try {
        const currentComponents = await prisma.deliverableComponent.findMany({
          where: { deliverableId, variantIndex: 0, groupType: 'variant' },
          orderBy: [{ order: 'asc' }, { variantIndex: 'asc' }, { id: 'asc' }],
        });
        const groupedForScoring: TextGenerationResult = {
          components: currentComponents
            .filter((c) => c.variantGroup && c.generatedContent)
            .map((c) => ({
              group: c.variantGroup!,
              variants: [{ content: c.generatedContent ?? '', tone: undefined }],
            })),
        };
        const humanVoiceMode = await resolveHumanVoiceMode(workspaceId);
        yield* runFidelityScoringPipeline({
          deliverableId,
          workspaceId,
          textResult: groupedForScoring,
          stack,
          textModelProvider: textModel.provider,
          humanVoiceMode,
        });
      } catch (rescoreErr) {
        console.error(
          '[canvas-orchestrator] re-score after regenerate failed:',
          (rescoreErr as Error).message,
        );
      }
    } else {
      yield {
        event: 'error',
        data: { message: `AI did not regenerate requested group "${group}"`, recoverable: true },
      };
    }
  }

  const totalDuration = Date.now() - startTime;
  yield {
    event: 'complete',
    data: { totalDuration, regeneratedGroup: group },
  };
}

// ─── Prompt Builders ──────────────────────────────────────

function buildCanvasPrompt(
  stack: CanvasContextStack,
  medium: MediumContext | null,
  options?: OrchestrationOptions,
  voiceDirective?: string,
  /** When provided: prompt asks for ONE variant only, framed by this angle.
   *  When null: legacy fallback — prompt asks for 2 variants in one call. */
  angle?: CreativeAngle | null,
): { systemPrompt: string; userPrompt: string } {
  // Use type-specific prompt template if available (expert persona, methodology, anti-patterns)
  const contentType = stack.deliverableTypeId ?? '';
  const typeTemplate = getPromptTemplate(contentType);

  const componentTemplate = resolveComponentTemplate(medium, contentType);
  const textGroups = componentTemplate
    .filter((t) => t.type !== 'image' && t.type !== 'hero-image' && t.type !== 'sound')
    .map((t) => ({
      type: t.type,
      maxLength: t.maxLength,
      required: t.required ?? false,
      isScriptedScene: t.isScriptedScene ?? false,
    }));
  // C3 (prompt-audit 2026-06-11): zero resolved groups previously produced a
  // self-contradicting prompt — "components array MUST contain exactly 0
  // entries" while the system prompt demands a complete document. The model
  // invents structure or returns nothing. Fail fast instead: both consumers
  // (studio orchestrate + campaign bulk-generate routes) catch generator
  // throws and surface them to the user as a generation-failure event.
  if (textGroups.length === 0) {
    console.error('[canvas-orchestrator] no component template resolved', {
      contentType: contentType || null,
      mediumPlatform: medium?.platform ?? null,
      mediumFormat: medium?.format ?? null,
      mediumTemplateLength: medium?.componentTemplate?.length ?? 0,
    });
    throw new Error(
      `No component template resolved for content type "${contentType || 'unknown'}" — generation aborted to avoid self-contradicting prompt`,
    );
  }
  const hasImageComponent = componentTemplate.some(
    (t) => t.type === 'image' || t.type === 'hero-image',
  );
  const hasScriptedScenes = textGroups.some((g) => g.isScriptedScene);

  const systemPrompt = [
    voiceDirective || '',
    typeTemplate.systemPrompt,
    '',
    'IMPORTANT: In addition to the type-specific instructions above, respond with valid JSON only. No markdown, no explanation, no code blocks — just the raw JSON object.',
    '',
    angle ? formatAngleInstruction(angle) : '',
    '',
    '## Brand Context',
    formatBrandContext(stack.brand),
    '',
    formatPersonaContext(stack.personas),
    stack.concept ? formatConceptContext(stack.concept) : '',
    stack.journeyPhase ? formatPhaseGuidance(stack.journeyPhase) : '',
    stack.brief ? formatBriefContext(stack.brief) : '',
    stack.products.length > 0 ? formatProductContext(stack.products) : '',
    formatContentTypeInputs(stack.contentTypeInputs, contentType),
    medium ? formatMediumSpecs(medium) : '',
    formatMergedMediumConfig(options?.mediumConfig, stack.contentTypeInputs),
    formatVisualBrief(stack.visualBrief ?? null),
    contentType ? formatConstraintsForPrompt(contentType) : '',
    // Headings (## PRIORITY SOURCE MATERIAL / ## ADDITIONAL CONTEXT) are emitted
    // by serializeContextForPrompt — inject raw to avoid a nested double heading.
    options?.additionalContextText ? `\n${options.additionalContextText}` : '',
    // F21 (audit 2026-05-13): self-check directive LAATSTE in system-prompt
    // zodat het de recency-positie pakt. Voiceguide-block bovenaan (BVD) +
    // self-check onderaan = bracketing dat AI dwingt te imiteren ipv
    // los advies te negeren.
    buildVoiceSelfCheckDirective(stack.brand),
  ]
    .filter(Boolean)
    .join('\n');

  const groupInstructions = textGroups
    .map((g) => {
      const maxLen = g.maxLength ? ` (max ${g.maxLength} characters)` : '';
      return `- "${g.type}"${maxLen}${g.required ? ' [REQUIRED]' : ''}`;
    })
    .join('\n');

  // Prompt-audit fase 2 review: de oude "exactly N entries"-eis telde ook
  // optionele groepen mee en sprak de type-template skip-instructies
  // ("OPTIONAL — skip rather than pad", o.a. faq/comparison/microsite)
  // direct tegen. Tel required apart; bij 0 required-markeringen (DB
  // medium-rows zonder flags) valt de prompt terug op exact-count, anders
  // zou "at least the 0 groups" alles omitbaar maken.
  const requiredGroupCount = textGroups.filter((g) => g.required).length;

  const imageInstruction = hasImageComponent
    ? buildImagePromptInstruction(stack.visualBrief ?? null)
    : '';

  const userInstruction = options?.instruction
    ? `\n\nUser instruction: ${options.instruction}`
    : '';

  const variantCountInstruction = angle
    ? `Generate exactly 1 variant for each of the following component groups, fully expressing the "${angle.label}" angle defined in the system prompt:`
    : 'Generate exactly 2 variants for each of the following component groups:';

  const userPrompt = [
    variantCountInstruction,
    groupInstructions,
    imageInstruction,
    userInstruction,
    '',
    '## FORMATTING RULES',
    'Formatting depends on the variant group. The UI renders some groups as plain text (no markdown parser) and others as rich markdown. Respect this:',
    '',
    '### Plain-text-only groups (NEVER use markdown syntax, NO leading #, no **bold**, no [links], no list markers)',
    '- "title" — one line, max 120 chars, the article/page title written as normal prose. DO NOT start with "# ".',
    '  GOOD: "How to choose a CRM for SaaS"',
    '  BAD:  "# How to choose a CRM for SaaS"  (raw # leaks into the UI)',
    '- "headline" / "subheadline" — short line, max 120-140 chars, plain prose. No leading "##".',
    '- "meta" / "meta-description" — one sentence, max 160 chars, no markdown, no quotes around it. DO NOT prefix with "Meta:" or "Description:".',
    '- "subject" — email subject line, max 78 chars, plain text.',
    '- "preheader" — email preheader, max 110 chars, plain text.',
    // Aligned with the storage clamp (variant-content-sanitizer cap 48) —
    // promising 80 chars while storage cuts at 48 silently truncated CTAs.
    '- "cta" — SHORT imperative button text. HARD LIMIT: 6 words AND 48 characters. Ideally 2-5 words.',
    '  This is BUTTON text, not a paragraph. If you cannot say it in 6 words, you are doing it wrong.',
    '  GOOD: "Start free trial" · "Book a demo" · "Download the guide" · "Get instant access"',
    '  BAD:  "Start your free trial today and get unlimited access for the first month." (full sentence)',
    '  BAD:  "## Get started with our solution"  (markdown header)',
    '  BAD:  "Click here to learn more about how we can help you transform your brand strategy"  (paragraph)',
    '- "slug" — URL-friendly string, max 80 chars, lowercase-dashes, no markdown.',
    '',
    '### Markdown-rich groups (USE markdown for visual hierarchy)',
    '- "body" / "hook" / "content" / "paragraph" / "intro" / "conclusion" — use markdown for well-structured prose.',
    '- HEADINGS (inside body only): Use sentence case (only capitalize the first word and proper nouns). NEVER Title Case. Example: "## How to build a brand strategy" NOT "## How To Build A Brand Strategy".',
    '- BRAND NAMES: Always preserve original capitalization ("iPhone", "LinkedIn", "HubSpot"). Never lowercase.',
    '- NEVER generate a table of contents with anchor links like [Title](#slug). Just use ## headings.',
    '- NEVER use horizontal rules (---) to separate sections — use ## headings.',
    '- Use ## for sections, ### for sub-sections.',
    '- Use **bold** for key phrases, *italic* for quotes/emphasis, - bullets for enumerations.',
    '- Separate paragraphs with blank lines (\\n\\n).',
    '- Long-form (blog/article/whitepaper): intro + 2-4 headed sections + conclusion.',
    '- Short-form (social/ads/email): tight paragraphs, bold for hooks.',
    '- Never output a wall of unformatted text in body groups — always visual hierarchy.',
    '',
    // 2026-05-19 — Override for video-script content types. The
    // hook/body/cta groups are SCRIPTED SCENES (markdown-rich prose with
    // [VISUAL] cues + Caption: lines), not button-text. This block flips
    // the "cta = SHORT button" rule above for video types so the model
    // can emit a full Offer-beat scripted scene under the `cta` group.
    hasScriptedScenes
      ? [
          '### Scripted-scene override (THIS DELIVERABLE IS A VIDEO SCRIPT)',
          'The "hook" / "body" / "cta" groups are SCRIPTED SCENES, not plain-text fields. The cta-as-button-text rule above does NOT apply here — for this video script, "cta" = the Offer scene (15-25 words spoken + visual + caption), NOT a 2-5 word button label.',
          'Each scripted-scene group MUST contain:',
          '  - Spoken dialogue / voiceover lines (bold the most stopping line with **…**).',
          '  - EXACTLY ONE `[VISUAL: …]` cue — the SINGLE DOMINANT shot. This is what the image-generator renders, so it must be ONE coherent frame, NOT a comma-list of shots ("inmeten, werkplaats, montage"). Pick the most important moment of the scene and describe just that frame: subject, composition, framing, on-screen text overlay if any. NEVER describe multiple shots inside `[VISUAL: …]`.',
          '  - OPTIONAL `[B-ROLL: …]` line — secondary motion / cut details that animate the dominant shot. Use this when the scene needs montage-feel: "rapid cut to detail of …", "camera pans to …", "intercut with …". The video-generator picks this up as motion direction over the dominant VISUAL still. Keep it ONE sentence, max ~25 words.',
          '  - A `[CAPTION]` line with the burned-in caption text (silent autoplay readability).',
          'Scene durations (typical paid LinkedIn video, 8-15s total):',
          '  - hook: 0-3s, 8-12 words spoken, pattern-interrupt visual',
          '  - body: 3-10s, 25-40 words spoken, proof/credibility',
          '  - cta: 10-15s, 15-25 words spoken, specific offer + next step',
          'Keep scenes self-contained — viewer may drop off after Hook. Each scene must read as a complete beat on its own.',
          'The button-text CTA still appears on each variant\'s top-level "cta" field (2-6 words) — that\'s separate from the cta-scene group content.',
          '',
          'Example BODY scene (correct VISUAL + B-ROLL split):',
          '  **Bewijs in beeld: gespecificeerd in 50%+ van high-end woningprojecten.**',
          '  [VISUAL: Naadloos afgewerkt vloerluik in een hoogwaardig parket-interieur, lage cameraframing op vloerniveau.]',
          '  [B-ROLL: Snelle inserts van inmeten met rolmaat en werkplaats-detail, camera dolly van detail naar wide shot.]',
          '  [CAPTION] Gespecificeerd in 50%+ van high-end woningprojecten.',
          '',
        ].join('\n')
      : '',
    'Response schema:',
    '{',
    '  "components": [',
    '    { "group": "<group-name-from-list-above>", "variants": [{ "content": "...", "tone": "...", "cta": "..." }, ...] },',
    '    { "group": "<another-group-name>", "variants": [...] },',
    requiredGroupCount > 0
      ? `    // ... ONE entry per group listed above (${requiredGroupCount} marked [REQUIRED]; groups not marked [REQUIRED] may be omitted)`
      : `    // ... ONE entry per group listed above (total: ${textGroups.length} component(s))`,
    '  ],',
    hasImageComponent
      ? '  "imagePrompts": [{ "description": "...", "style": "..." }]'
      : '',
    '}',
    '',
    // 2026-05-22 — multi-group content-types (display-ad with 11 groups,
    // search-ad with 15) need explicit reinforcement that the schema example
    // shows SHAPE not COUNT. Otherwise model emits 1 generic "description"
    // group and 10 banner-fields stay empty in the preview.
    requiredGroupCount > 0
      ? `CRITICAL: The "components" array MUST contain at least the ${requiredGroupCount} ${requiredGroupCount === 1 ? 'group' : 'groups'} marked [REQUIRED] (in the order listed); groups not marked [REQUIRED] may be omitted when the brief does not support them — never pad with empty entries. Skipping a [REQUIRED] group leaves its UI slot empty (placeholder text instead of generated content). Do NOT collapse multiple groups into one generic "description" or "content" group.`
      : `CRITICAL: The "components" array MUST contain exactly ${textGroups.length} ${textGroups.length === 1 ? 'entry' : 'entries'} — one per group listed above. Skipping any group leaves its UI slot empty (placeholder text instead of generated content). Do NOT collapse multiple groups into one generic "description" or "content" group.`,
    angle
      ? 'Each group has exactly 1 variant — make it fully express the angle.'
      : 'Each group must have exactly 2 variants with different creative approaches.',
    'IMPORTANT: Every variant MUST include a "cta" field — a short, compelling call-to-action text in plain text, 2-6 words (max ~48 characters), no markdown. Examples: "Start your free trial", "Learn more", "Book a demo", "Shop now". The CTA should match the content goal and platform. NEVER a paragraph. NEVER leave it empty.',
    'Ensure all content is on-brand and appropriate for the target platform.',
  ]
    .filter(Boolean)
    .join('\n');

  return { systemPrompt, userPrompt };
}

function buildRegenerationPrompt(
  stack: CanvasContextStack,
  existingComponents: Array<{ variantGroup: string | null; generatedContent: string | null; variantIndex: number }>,
  group: string,
  feedback: string,
  options?: OrchestrationOptions,
  voiceDirective?: string,
): { systemPrompt: string; userPrompt: string } {
  const groupComponents = existingComponents.filter((c) => c.variantGroup === group);

  const regenContentType = stack.deliverableTypeId ?? '';
  const regenTemplate = getPromptTemplate(regenContentType);

  const systemPrompt = [
    voiceDirective || '',
    regenTemplate.systemPrompt,
    '',
    'You are regenerating a specific content component group based on user feedback.',
    '',
    'IMPORTANT: In addition to the type-specific instructions above, respond with valid JSON only. No markdown, no explanation, no code blocks — just the raw JSON object.',
    '',
    '## Brand Context',
    formatBrandContext(stack.brand),
    '',
    formatPersonaContext(stack.personas),
    stack.concept ? formatConceptContext(stack.concept) : '',
    stack.journeyPhase ? formatPhaseGuidance(stack.journeyPhase) : '',
    stack.brief ? formatBriefContext(stack.brief) : '',
    stack.products.length > 0 ? formatProductContext(stack.products) : '',
    formatContentTypeInputs(stack.contentTypeInputs, regenContentType),
    formatMergedMediumConfig(options?.mediumConfig, stack.contentTypeInputs),
    formatVisualBrief(stack.visualBrief ?? null),
    regenContentType ? formatConstraintsForPrompt(regenContentType) : '',
    // Headings (## PRIORITY SOURCE MATERIAL / ## ADDITIONAL CONTEXT) are emitted
    // by serializeContextForPrompt — inject raw to avoid a nested double heading.
    options?.additionalContextText ? `\n${options.additionalContextText}` : '',
    // F21 (audit 2026-05-13): self-check ook in regeneration-path zodat
    // single-component-rewrites dezelfde voice-discipline volgen.
    buildVoiceSelfCheckDirective(stack.brand),
  ]
    .filter(Boolean)
    .join('\n');

  const existingContent = groupComponents
    .map((c) => `Variant ${c.variantIndex}: ${c.generatedContent ?? '(empty)'}`)
    .join('\n');

  const userPrompt = [
    `Regenerate the "${group}" component group.`,
    '',
    'Existing content:',
    existingContent,
    '',
    `User feedback: ${feedback}`,
    '',
    'Generate 2 improved variants that address the feedback while staying on-brand.',
    'IMPORTANT: Every variant MUST include a "cta" field — SHORT button text only. HARD LIMIT: 6 words AND 48 characters. Plain text, no markdown. Examples: "Start free trial", "Book a demo", "Download the guide". NEVER a sentence or paragraph.',
    '',
    `FORMATTING depends on the group. For "${group}" specifically:`,
    ...(isPlainTextGroup(group)
      ? [
          `- "${group}" is PLAIN TEXT ONLY. No markdown. No leading "#" or "##". No **bold**. No [links]. Output must be a single plain sentence/phrase that renders as-is.`,
        ]
      : [
          `- "${group}" supports markdown. Use ## headings (sentence case, NOT Title Case), ### sub-headings, **bold**, *italic*, - bullet lists, and blank lines between paragraphs. Always preserve original capitalization of brand/product/company names. Never output unformatted walls of text.`,
        ]),
    '',
    'Response schema:',
    '{',
    '  "components": [',
    `    { "group": "${group}", "variants": [{ "content": "## Heading\\n\\nParagraph with **bold**...\\n\\n- Bullet point", "tone": "...", "cta": "Get Started" }, { "content": "...", "tone": "...", "cta": "Learn More" }] }`,
    '  ]',
    '}',
  ].join('\n');

  return { systemPrompt, userPrompt };
}

// ─── Context Formatters ───────────────────────────────────

function formatConceptContext(concept: NonNullable<CanvasContextStack['concept']>): string {
  const parts: string[] = ['## Campaign Concept'];
  if (concept.campaignTheme) parts.push(`Theme: ${concept.campaignTheme}`);
  if (concept.positioningStatement) parts.push(`Positioning: ${concept.positioningStatement}`);
  if (concept.strategicApproach) parts.push(`Approach: ${concept.strategicApproach}`);
  if (concept.keyMessages.length > 0) parts.push(`Key Messages:\n${concept.keyMessages.map((m) => `- ${m}`).join('\n')}`);
  if (concept.humanInsight) parts.push(`Human Insight: ${concept.humanInsight}`);
  if (concept.creativePlatform) parts.push(`Creative Platform: ${concept.creativePlatform}`);
  if (concept.targetAudienceInsights) parts.push(`Target Audience: ${concept.targetAudienceInsights}`);
  return parts.join('\n');
}

function formatPhaseGuidance(phase: JourneyPhaseContext): string {
  return [
    '## Journey Phase Guidance',
    `Phase: ${phase.phase}`,
    `Week in Campaign: ${phase.weekInCampaign}`,
    `Message Guidance: ${phase.messageGuidance}`,
    `Tone: ${phase.toneAdjustment}`,
    `CTA Direction: ${phase.ctaDirection}`,
    phase.phaseObjectives.length > 0
      ? `Objectives:\n${phase.phaseObjectives.map((o) => `- ${o}`).join('\n')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function formatMediumSpecs(medium: MediumContext): string {
  const parts: string[] = [
    '## Platform Specifications',
    `Platform: ${medium.platform}`,
    `Format: ${medium.format}`,
  ];

  if (medium.specs) {
    parts.push(`Specs: ${JSON.stringify(medium.specs)}`);
  }

  if (medium.bestPractices.length > 0) {
    parts.push(`Best Practices:\n${medium.bestPractices.map((bp) => `- ${bp}`).join('\n')}`);
  }

  if (medium.phaseGuidance) {
    const pg = medium.phaseGuidance as Record<string, string>;
    parts.push('Phase-Specific Guidance:');
    for (const [key, value] of Object.entries(pg)) {
      parts.push(`  ${key}: ${value}`);
    }
  }

  return parts.join('\n');
}

function formatMediumConfig(config: Record<string, unknown>): string {
  const entries = Object.entries(config).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  );
  if (entries.length === 0) return '';

  const parts: string[] = ['## Medium Configuration (User-Specified)'];

  // Web-page specific: provide detailed, actionable instructions
  const pageLayout = config.pageLayout as string | undefined;
  const heroStyle = config.heroStyle as string | undefined;
  const sectionCount = config.sectionCount as number | undefined;
  const ctaType = config.ctaType as string | undefined;
  const seoFocus = config.seoFocus as boolean | undefined;

  if (pageLayout || heroStyle || sectionCount || ctaType) {
    if (pageLayout) {
      const layoutMap: Record<string, string> = {
        'single-column': 'Single-column article layout — focused, sequential reading flow.',
        'two-column': 'Two-column layout — main content on the left, sidebar on the right with highlights and related links. Structure the content with clear section headings.',
        'magazine': 'Magazine-style layout — wider format with a prominent pull-quote from the opening paragraph. Use vivid, editorial language.',
      };
      parts.push(`- Page layout: ${layoutMap[pageLayout] ?? pageLayout}`);
    }
    if (heroStyle) {
      const heroMap: Record<string, string> = {
        'full-bleed-image': 'Full-bleed hero image above the title.',
        'split-content': 'Split hero — title and intro text on the left, image on the right. Write a compelling short intro (2-3 sentences) that works alongside the hero image.',
        'video-hero': 'Video hero section — reference a video embed in the opening.',
        'text-only': 'Text-only hero — no image. The headline must be strong enough to stand on its own.',
        'animated': 'Animated/gradient hero background — keep the title concise and high-impact.',
      };
      parts.push(`- Hero style: ${heroMap[heroStyle] ?? heroStyle}`);
    }
    if (sectionCount) {
      parts.push(`- Target section count: ${sectionCount} content sections. Each section should have a clear ## heading.`);
    }
    if (ctaType) {
      const ctaMap: Record<string, string> = {
        'button': 'End with a clear call-to-action button text (e.g. "Get Started", "Learn More").',
        'form': 'End with a sign-up/newsletter CTA section — include a compelling reason to subscribe.',
        'calendar': 'End with a "Book a Demo" CTA — include a brief value proposition for the meeting.',
        'download': 'End with a download CTA — describe what the reader will get (guide, whitepaper, checklist).',
      };
      parts.push(`- CTA type: ${ctaMap[ctaType] ?? ctaType}`);
    }
    if (seoFocus === true) {
      parts.push('- SEO optimized: Use the primary keyword in the title, first paragraph, and at least 2 section headings. Write a compelling meta description (max 155 characters). Use a clear heading hierarchy (H2 for sections, H3 for sub-sections).');
    }
  }

  // ── Social Post ────────────────────────────────────────
  // Tone + CTA were removed from contentTypeInputs in favour of the unified
  // Strategy fields (brief.toneDirection / brief.callToAction). The legacy
  // `tone` and `ctaStyle` reads stay here so old deliverables created before
  // the migration still respect their stored values; new deliverables get
  // tone/CTA via the brief block instead. The social block trigger now
  // includes hashtagStrategy / visualStyle / includeEmoji so it fires even
  // when tone/CTA are no longer in contentTypeInputs.
  const tone = config.tone as string | undefined;
  const hashtagStrategy = config.hashtagStrategy as string | undefined;
  const ctaStyleSocial = config.ctaStyle as string | undefined;
  const includeEmoji = config.includeEmoji as boolean | undefined;
  const visualStyle = config.visualStyle as string | undefined;

  if (tone || hashtagStrategy || ctaStyleSocial || visualStyle || includeEmoji !== undefined) {
    if (tone) parts.push(`- Tone: Write in a ${tone} voice.`);
    if (visualStyle) parts.push(`- Visual style: ${visualStyle}.`);
    if (hashtagStrategy) {
      const hMap: Record<string, string> = {
        none: 'Do NOT include hashtags.',
        minimal: 'Include 1-3 relevant hashtags at the end.',
        moderate: 'Include 3-5 hashtags. Mix branded + industry tags.',
        aggressive: 'Include 5-10 hashtags for maximum reach.',
        // Migrated from medium-config-registry social-post categorie:
        trending: 'Include 4-6 trending hashtags relevant to current discourse, mixed with 1-2 brand hashtags.',
        niche: 'Include 3-5 niche/community-specific hashtags that target your exact audience — favour specificity over reach.',
        branded: 'Include 2-4 brand-specific hashtags (campaign tag, brand handle, signature tag).',
        mixed: 'Include 4-6 hashtags blending trending, niche-community, and branded tags.',
      };
      parts.push(`- Hashtags: ${hMap[hashtagStrategy] ?? hashtagStrategy}`);
    }
    if (ctaStyleSocial && ctaStyleSocial !== 'none') {
      parts.push(`- CTA: End with a clear "${ctaStyleSocial.replace(/-/g, ' ')}" call-to-action.`);
    }
    if (includeEmoji) {
      // F-emoji-fix (audit 2026-05-15): single "use emoji naturally" line is
      // outvoted by the platform template few-shot (zero emojis) and the
      // "NEVER use emoji as bullet points" antipattern, so the toggle was
      // effectively a no-op. Concrete count + placement guidance overrides
      // the conservative default. The few-shot example does NOT include
      // emojis, so we explicitly tell the model this post is the exception.
      parts.push(
        '- EMOJI USAGE (REQUIRED): Include 2-4 emojis in this post, weaved into the body at emotional inflection points or to anchor a key sentence. This overrides any "no emoji" tendency from the platform examples — the user has explicitly opted in. Do NOT use emojis as bullet-list markers or stack them at sentence ends; they must feel intentional, not decorative.',
      );
    }
  }

  // ── Carousel ───────────────────────────────────────────
  const slideCount = config.slideCount as number | undefined;
  const slideFormat = config.slideFormat as string | undefined;
  const includeCtaSlide = config.includeCtaSlide as boolean | undefined;

  if (slideCount || slideFormat) {
    if (slideCount) parts.push(`- Slides: Create exactly ${slideCount} slides. Each slide should have a clear heading and 1-2 key points.`);
    if (slideFormat) parts.push(`- Slide format: ${slideFormat}.`);
    if (includeCtaSlide) parts.push('- Final slide: Include a dedicated CTA slide with a clear action for the reader.');
  }

  // ── Email ──────────────────────────────────────────────
  const templateStyle = config.templateStyle as string | undefined;
  const headerType = config.headerType as string | undefined;
  const emailCtaPlacement = config.ctaPlacement as string | undefined;
  const personalize = config.personalize as boolean | undefined;
  const previewTextLength = config.previewTextLength as string | undefined;

  if (templateStyle || headerType || personalize !== undefined) {
    if (templateStyle) parts.push(`- Email template: ${templateStyle} style.`);
    if (headerType) parts.push(`- Header: ${headerType.replace(/-/g, ' ')}.`);
    if (emailCtaPlacement) parts.push(`- CTA placement: ${emailCtaPlacement} of the email body.`);
    if (personalize) parts.push('- Personalization: Include {{firstName}} placeholder in the greeting.');
    if (previewTextLength) parts.push(`- Preview text: ${previewTextLength} length (shown in inbox before opening).`);
  }

  // ── Podcast ────────────────────────────────────────────
  const episodeFormat = config.episodeFormat as string | undefined;
  const duration = config.duration as number | undefined;
  const segmentCount = config.segmentCount as number | undefined;
  const introStyle = config.introStyle as string | undefined;
  const includeShowNotes = config.includeShowNotes as boolean | undefined;
  const includeTranscript = config.includeTranscript as boolean | undefined;

  if (episodeFormat || duration) {
    if (episodeFormat) parts.push(`- Episode format: ${episodeFormat}. Structure the script accordingly.`);
    if (duration) parts.push(`- Target duration: ${duration} minutes.`);
    if (segmentCount) parts.push(`- Segments: Structure into ${segmentCount} distinct segments with transitions.`);
    if (introStyle) parts.push(`- Intro style: ${introStyle}.`);
    if (includeShowNotes) parts.push('- Include show notes with timestamps and key takeaways.');
    if (includeTranscript) parts.push('- Format as a full transcript with speaker labels.');
  }

  // ── Advertising ────────────────────────────────────────
  // urgencyLevel deprecated 2026-05-17: input-type was number (1-5) but
  // this branch compared against string 'high', so the urgency-language
  // branch never fired. Plus it overlapped with adCtaType (which has
  // limited-time-offer) + hookFormat (drives opener tone) + (for promo
  // email) urgencyMechanism. Strategic urgency now flows through those
  // three more-specific fields. Old data ignored — storage stays.
  const adFormat = config.adFormat as string | undefined;
  const socialProof = config.socialProof as boolean | undefined;

  if (adFormat) {
    // Q3 (2026-05-19): format-specific instructie ipv generieke "follow
    // platform best practices". Output-shape verschilt per format
    // (LinkedIn-ad Single Image vs Video vs Message Ad).
    const adFormatLabel = getLinkedInAdFormatLabel(adFormat);
    parts.push(`- Ad format: **${adFormatLabel}** (key: \`${adFormat}\`).`);

    if (adFormat === 'single-image') {
      parts.push(
        '  Required output shape: (1) intro-text 100-150w, (2) headline max 70 chars, (3) one-line description max 100 chars, (4) clear CTA matching campaign goal. Visual is hero-image with text overlay.',
      );
    } else if (adFormat === 'message-ad') {
      parts.push(
        '  Required output shape: (1) subject line max 60 chars (personal-tone, no marketing jargon), (2) sender name + role, (3) body 100-150w in first-person warm tone like a 1-op-1 InMail, (4) CTA-button label max 25 chars. NO hero-image — this is inMail format. Avoid generic "Dear [Name]" — make it specific to persona.',
      );
    }
    // Note: video-ad subformat split-out naar dedicated content-type
    // `linkedin-video-ad` (2026-05-19). Geen video-branch hier nodig.

    if (config.ctaType && !ctaType) parts.push(`- CTA: ${config.ctaType as string}.`);
    if (socialProof) parts.push('- Include social proof (numbers, testimonials, or trust signals).');
  }

  // ── Video ──────────────────────────────────────────────
  const videoDuration = config.duration as number | undefined;
  const aspectRatio = config.aspectRatio as string | undefined;
  const footageType = config.footageType as string | undefined;
  const textOverlay = config.textOverlay as boolean | undefined;

  if (aspectRatio || footageType) {
    if (videoDuration) parts.push(`- Video duration: ${videoDuration} seconds.`);
    if (aspectRatio) parts.push(`- Aspect ratio: ${aspectRatio}.`);
    if (footageType) parts.push(`- Footage type: ${footageType}.`);
    if (textOverlay) parts.push('- Include text overlay directions for key moments.');
  }

  // ── Long-form (blog / pillar / whitepaper / case-study / article / FAQ) ──
  const longFormTone = config.tone as string | undefined;
  const articleStructure = config.articleStructure as string | undefined;
  const readingLevel = config.readingLevel as number | undefined;
  const includeFaq = config.includeFaq as boolean | undefined;
  const includeQuotes = config.includeQuotes as boolean | undefined;
  const internalLinking = config.internalLinking as string | undefined;
  const longFormSeoFocus = config.seoFocus as boolean | undefined;

  if (
    longFormTone ||
    articleStructure ||
    readingLevel ||
    includeFaq !== undefined ||
    includeQuotes !== undefined ||
    internalLinking ||
    longFormSeoFocus !== undefined
  ) {
    if (longFormTone) parts.push(`- Tone: ${longFormTone}.`);
    if (articleStructure) {
      const structMap: Record<string, string> = {
        'deep-dive': 'Deep-dive structure: thorough exploration with sub-headings, build the argument step by step.',
        'listicle': 'Listicle structure: numbered or labeled list of distinct points (e.g. "5 ways to ...").',
        'how-to': 'How-to structure: actionable, step-by-step guide with clear procedural headings.',
        'explainer': 'Explainer structure: define the concept, then unpack it from first principles to advanced.',
        'comparison': 'Comparison structure: side-by-side analysis of options with clear criteria.',
        'narrative': 'Narrative structure: story-driven with a clear arc — situation, complication, resolution.',
      };
      parts.push(`- Article structure: ${structMap[articleStructure] ?? articleStructure}`);
    }
    if (typeof readingLevel === 'number') {
      const levelLabel =
        readingLevel <= 2 ? 'beginner / general audience — short sentences, plain language, no jargon'
        : readingLevel >= 4 ? 'expert / technical — assume domain knowledge, use precise terminology'
        : 'intermediate — clear and accessible but not dumbed down';
      parts.push(`- Reading level: ${levelLabel} (${readingLevel}/5).`);
    }
    if (includeFaq === true) {
      parts.push('- FAQ section: REQUIRED. After the conclusion, add a clearly-labeled "Frequently Asked Questions" or "FAQ" section with 4-6 question-and-answer pairs that address common concerns about the topic. Format each as a "## Question" heading followed by a 1-3 sentence answer.');
    } else if (includeFaq === false) {
      parts.push('- FAQ section: do NOT include a FAQ block.');
    }
    if (includeQuotes === true) {
      parts.push('- Expert quotes: insert 2-3 quote markers in the format `> "Quote text" — Expert Name, Title` at relevant points. Use realistic placeholder quotes the user can replace.');
    }
    if (internalLinking) {
      const linkMap: Record<string, string> = {
        subtle: '1-2 contextual `[Internal Link: anchor text]` markers in the body.',
        moderate: '3-5 `[Internal Link: anchor text]` markers spread across the sections.',
        aggressive: '6+ `[Internal Link: anchor text]` markers — build a topic-cluster effect.',
        none: 'no internal link markers.',
      };
      parts.push(`- Internal linking: ${linkMap[internalLinking] ?? internalLinking}`);
    }
    if (longFormSeoFocus === true) {
      parts.push('- SEO focus: optimize headings, meta description, and keyword density for search ranking. Include the primary keyword in title, first paragraph, and at least one H2.');
    }
  }

  // ── Sales (migrated 2026-05-08) ────────────────────────
  const salesAngle = config.salesAngle as string | undefined;
  const includePricing = config.includePricing as boolean | undefined;
  if (salesAngle || includePricing !== undefined) {
    if (salesAngle) {
      const angleMap: Record<string, string> = {
        'pain-point': 'Lead with the prospect\'s pain — diagnose the problem first, position the solution as the relief.',
        'value-prop': 'Lead with the unique value proposition — what only this product/service delivers, framed in outcome language.',
        'social-proof': 'Lead with social proof — concrete customer outcomes, named logos, quantified results — credibility before claims.',
        'roi': 'Lead with ROI / business case — concrete numbers (cost savings, revenue uplift, time-to-value).',
        'differentiator': 'Lead with the competitive differentiator — explicitly contrast with alternatives without naming competitors negatively.',
      };
      parts.push(`- Sales angle: ${angleMap[salesAngle] ?? salesAngle}`);
    }
    if (includePricing === true) {
      parts.push('- Include pricing: surface concrete price points or pricing-model details (per-seat, per-month, tiered). Never use placeholder values — omit if unknown rather than write €XX.');
    } else if (includePricing === false) {
      parts.push('- Pricing: do not include specific prices or pricing tiers — keep the message value-led; pricing conversation belongs in a follow-up.');
    }
  }

  // ── PR-HR (migrated 2026-05-08) ────────────────────────
  const prStructure = config.structure as string | undefined;
  const quoteCount = config.quoteCount as number | undefined;
  const includeBoilerplate = config.includeBoilerplate as boolean | undefined;
  const includeContactBlock = config.includeContactBlock as boolean | undefined;
  if (prStructure || quoteCount !== undefined || includeBoilerplate !== undefined || includeContactBlock !== undefined) {
    if (prStructure) {
      const structMap: Record<string, string> = {
        'inverted-pyramid': 'Inverted-pyramid structure: most newsworthy facts in the lede, supporting details after, background last. Standard journalistic form.',
        'narrative': 'Narrative structure: tell the story chronologically with a clear opening hook, middle development, and resolution.',
        'q-and-a': 'Q&A structure: question-answer format throughout, useful for FAQ-style internal comms or interview-format pitches.',
        'announcement': 'Announcement structure: lead with the news (what + when + who), then the why and how, finally next-steps + contact.',
      };
      parts.push(`- Structure: ${structMap[prStructure] ?? prStructure}`);
    }
    if (typeof quoteCount === 'number' && quoteCount > 0) {
      parts.push(`- Quotes: include ${quoteCount} on-record quote${quoteCount === 1 ? '' : 's'} from named spokesperson(s). Each quote should add a perspective the body copy cannot — emotion, vision, or specific commitment. Use [SPOKESPERSON NAME, TITLE] placeholders if specific names are not available.`);
    }
    if (includeBoilerplate === true) {
      parts.push('- Boilerplate: end with a standard "About [Company]" paragraph (~50-80 words) describing the company, mission, and key facts. Use [COMPANY BOILERPLATE] placeholder if specifics are unknown.');
    }
    if (includeContactBlock === true) {
      parts.push('- Contact block: end with a "Media Contact" section listing name, title, email, and phone. Use [PRESS CONTACT NAME / EMAIL / PHONE] placeholders.');
    }
  }

  // ── Carousel transition (migrated 2026-05-08) ──────────
  const transitionStyle = config.transitionStyle as string | undefined;
  if (transitionStyle) {
    const transMap: Record<string, string> = {
      'sequential': 'Sequential narrative — each slide builds linearly on the previous, like a story arc.',
      'thematic': 'Thematic — each slide explores a separate facet of the same topic; order matters less than coherence.',
      'comparison': 'Comparison — slides juxtapose options or "before/after" pairs, build to a recommendation.',
      'listicle': 'Listicle — numbered slides ("1 of 5 ways to...") with a strong hook on slide 1 and recap on the final.',
      'tutorial': 'Tutorial / step-by-step — each slide is one concrete action; keep slide-text short, image-led.',
    };
    parts.push(`- Carousel transition: ${transMap[transitionStyle] ?? transitionStyle}`);
  }

  // ── Video color + quality (migrated/retained 2026-05-08) ──
  const colorGrade = config.colorGrade as string | undefined;
  const videoQuality = config.quality as string | undefined;
  if (colorGrade) {
    const gradeMap: Record<string, string> = {
      warm: 'Warm color grade — gold/amber tones, evoke nostalgia or comfort. Phrasing should match: cozy, inviting, human.',
      cool: 'Cool color grade — blue/teal tones, evoke calm, professional, technical. Phrasing should match: precise, considered, credible.',
      vibrant: 'Vibrant color grade — saturated, high-contrast, energetic. Phrasing should match the energy: punchy, exclamatory-but-not-cheesy, action-oriented.',
      natural: 'Natural color grade — minimal grading, true-to-life. Phrasing should be matter-of-fact, documentary-style.',
    };
    parts.push(`- Color grade: ${gradeMap[colorGrade] ?? colorGrade}`);
  }
  if (videoQuality) {
    parts.push(`- Quality target: ${videoQuality} — assume the viewer sees crisp detail; reference visual elements precisely (typography, motion graphics, b-roll texture).`);
  }

  // If no category-specific rules matched, fall back to generic
  if (parts.length === 1) {
    for (const [key, value] of entries) {
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
      const display = typeof value === 'object' ? JSON.stringify(value) : String(value);
      parts.push(`- ${label}: ${display}`);
    }
  }

  parts.push('');
  parts.push('IMPORTANT: Adapt your content structure, tone, and format to match these medium configuration settings.');
  return parts.join('\n');
}

function formatConstraintsForPrompt(contentType: string): string {
  const typeDef = getDeliverableTypeById(contentType);
  if (!typeDef?.constraints) return '';

  const parts: string[] = ['## Content Constraints'];
  const c = typeDef.constraints;

  if (c.maxChars) parts.push(`- Maximum characters: ${c.maxChars}`);
  if (c.minChars) parts.push(`- Minimum characters: ${c.minChars}`);
  if (c.maxWords) parts.push(`- Maximum words: ${c.maxWords}`);
  if (c.minWords) parts.push(`- Minimum words: ${c.minWords}`);
  if (c.requiredSections?.length) parts.push(`- Required sections: ${c.requiredSections.join(', ')}`);
  if (c.maxHashtags) parts.push(`- Maximum hashtags: ${c.maxHashtags}`);
  if (c.maxSlides) parts.push(`- Maximum slides: ${c.maxSlides}`);

  if (parts.length === 1) return '';
  parts.push('');
  parts.push('IMPORTANT: Strictly adhere to these constraints. Do not exceed character or word limits.');
  return parts.join('\n');
}

function formatPersonaContext(personas: PersonaContext[]): string {
  if (personas.length === 0) return '';
  const parts = ['## Target Personas', 'Adapt your content to resonate with these target personas:'];
  for (const p of personas) {
    parts.push(`\n### ${p.name}`);
    parts.push(p.serialized);
  }
  return parts.join('\n');
}

function formatBriefContext(brief: BriefContext): string {
  const parts: string[] = ['## Content Brief'];
  if (brief.objective) parts.push(`Objective: ${brief.objective}`);
  if (brief.keyMessage) parts.push(`Key Message: ${brief.keyMessage}`);
  if (brief.toneDirection) parts.push(`Tone Direction: ${brief.toneDirection}`);
  if (brief.callToAction) parts.push(`Call to Action: ${brief.callToAction}`);
  if (brief.contentOutline.length > 0) {
    parts.push(`Content Outline:\n${brief.contentOutline.map((item) => `- ${item}`).join('\n')}`);
  }
  if (parts.length === 1) return '';
  return parts.join('\n');
}

function formatProductContext(products: ProductContext[]): string {
  if (products.length === 0) return '';
  const parts: string[] = ['## Product Context', 'Reference these products/services in your content where relevant:'];
  for (const p of products) {
    parts.push(`\n### ${p.name}`);
    if (p.description) parts.push(`Description: ${p.description}`);
    if (p.category) parts.push(`Category: ${p.category}`);
    if (p.pricingModel) parts.push(`Pricing Model: ${p.pricingModel}`);
    if (p.pricingDetails) parts.push(`Pricing Details: ${p.pricingDetails}`);
    if (p.features.length > 0) parts.push(`Features:\n${p.features.map((f) => `- ${f}`).join('\n')}`);
    if (p.benefits.length > 0) parts.push(`Benefits:\n${p.benefits.map((b) => `- ${b}`).join('\n')}`);
    if (p.useCases.length > 0) parts.push(`Use Cases:\n${p.useCases.map((u) => `- ${u}`).join('\n')}`);
  }
  return parts.join('\n');
}

/**
 * Keys that formatMediumConfig already turns into rich, actionable AI
 * instructions ("Hashtags: include 4-6 trending tags ..."). When the same
 * key is also present in contentTypeInputs (post 9.0c migration), we skip
 * it here to avoid emitting a flat duplicate ("- Hashtag Strategy: mixed")
 * that would compete with the rich version.
 */
const MEDIUM_CONFIG_HANDLED_KEYS = new Set<string>([
  // Long-form
  'tone', 'articleStructure', 'readingLevel', 'includeFaq', 'includeQuotes',
  'internalLinking', 'seoFocus',
  // Web-page
  'pageLayout', 'heroStyle', 'sectionCount', 'ctaType',
  // Social-post (migrated 9.0c)
  'visualStyle', 'hashtagStrategy', 'ctaStyle', 'includeEmoji',
  // Carousel
  'slideCount', 'slideFormat', 'includeCtaSlide', 'transitionStyle',
  // Email
  'templateStyle', 'headerType', 'ctaPlacement', 'personalize', 'previewTextLength',
  // Podcast
  'episodeFormat', 'duration', 'segmentCount', 'introStyle',
  'includeShowNotes', 'includeTranscript',
  // Advertising (urgencyLevel deprecated 2026-05-17 — see block above)
  'adFormat', 'socialProof',
  // Sales (migrated 2026-05-08)
  'salesAngle', 'includePricing',
  // PR-HR (migrated 2026-05-08; hasEmbargo dropped 2026-04-28 als irrelevant voor HR/internal/career)
  'structure', 'quoteCount', 'includeBoilerplate', 'includeContactBlock',
  // Video
  'aspectRatio', 'footageType', 'textOverlay', 'colorGrade', 'quality',
]);

// Per-hookFormat instruction snippets — make hookFormat-value choices
// concrete for the AI instead of a thin "- Hook Format: pattern-interrupt"
// label. Drives the OPENING of conversion content (social posts, ads,
// promo-emails). See docs/audits/2026-05-08-canvas-per-item-tweaks-plan.md.
const HOOK_FORMAT_INSTRUCTIONS: Record<string, string> = {
  'pattern-interrupt':
    'Open with a sentence that breaks expected rhythm. Forbidden openers: "Did you know", "I want to share", "Excited to announce", "In today\'s world". Make the reader pause on line one.',
  'question':
    'Open with a probing question the persona genuinely wonders about. Not rhetorical; not a setup-for-product. The question itself must be the hook.',
  'stat':
    'Open with a surprising number or statistic in the first line. Make the magnitude itself carry the hook — no preamble like "A recent study found that".',
  'contrarian-take':
    'Open by challenging a commonly-held belief in this space. State the contrarian position in the first sentence; defend it after. No "many people think X, but actually" — just state the contrarian claim flat.',
  'story-open':
    'Open with a 1-2 sentence narrative micro-scene — concrete moment, named subject, sensory detail. Pivot to the point in line 3.',
  'listicle-promise':
    'Open by promising a specific number of items / steps / lessons (e.g. "3 dingen die ik fout deed bij merkconsistentie"). The number-promise is the hook.',
};

function buildHookFormatLine(value: string): string {
  const snippet = HOOK_FORMAT_INSTRUCTIONS[value];
  if (!snippet) return `- Hook Format: ${value}`;
  return `- Hook Format (${value}): ${snippet}`;
}

// Authority-frame (long-form) and narrative-anchor (PR/case) keys that
// need rich rendering instead of thin "- Label: value" lines. These keys
// drive the OPENING / THESIS / NARRATIVE-PIVOT and require explicit
// "do this, not that" framing to prevent default descriptive-blog output.
// See docs/audits/2026-05-08-canvas-per-item-tweaks-plan.md sectie 3.2.
const AUTHORITY_RICH_RENDERS: Record<string, (val: string) => string> = {
  uniqueAngle: (val) =>
    `- **Unique Angle (THESIS — drives H1 + lead-paragraph)**: ${val}\n  → The H1 MUST express this angle, not a descriptive title like "What is X" or "A Comprehensive Guide to Y". The lead-paragraph MUST stake out this position before any context-setting.`,
  counterClaim: (val) =>
    `- **Counter-Claim (ANTI-THESIS — explicitly refute this)**: ${val}\n  → Name and refute this counter-claim within the first 200 words. Do not skip it; the refutation is the argument.`,
  evidencePieces: (val) =>
    `- **Evidence Pieces (weave naturally into argument)**:\n${val.split(/\n/).map((line) => `    • ${line.replace(/^[-•*]\s*/, '').trim()}`).filter((l) => l.length > 4).join('\n')}\n  → Integrate these into the running argument as the content unfolds. Do NOT list them as a separate bullet-section. Each evidence piece should appear in the natural place where it strengthens a claim.`,
  pivotMoment: (val) =>
    `- **Pivot Moment (NARRATIVE SCHARNIER — the story turns here)**: ${val}\n  → The lead-paragraph MUST hint at this pivot. The body MUST land on this moment as the turning point. Do not bury it in a middle-paragraph.`,
  whyNowAngle: (val) =>
    `- **Why Now (JOURNALISTIC HOOK — opens the piece)**: ${val}\n  → The first sentence MUST establish this timing-relevance. PR/case content without why-now reads as evergreen marketing copy.`,
};

// Skeleton renderers — multi-section content (carousels / decks / pages /
// outlines / videos). The AI loves to invent its own slide/section titles
// or re-order them for "better flow"; this rendering forbids that
// explicitly. See canvas-tweaks-structured-skeleton task notes risico 1.
function buildSkeletonRender(itemName: string, itemPlural: string): (val: string) => string {
  return (val) => {
    const items = val
      .split(/\n/)
      .map((line) => line.replace(/^[-•*]\s*/, '').trim())
      .filter((l) => l.length > 0);
    const numbered = items.map((item, i) => `    ${i + 1}. ${item}`).join('\n');
    return [
      `- **${itemName.charAt(0).toUpperCase() + itemName.slice(1)} Skeleton (USE EXACTLY — do NOT modify, reorder, or add)**:`,
      numbered,
      `  → THESE are the ${itemPlural}. Use them in this order. Each ${itemName} MUST appear exactly once. Do NOT invent additional ${itemPlural}. Do NOT merge or split them. The titles above are the ${itemName} headings — the body of each ${itemName} expands the title, but the title-text itself is fixed.`,
    ].join('\n');
  };
}

const SKELETON_RICH_RENDERS: Record<string, (val: string) => string> = {
  slideSkeleton: buildSkeletonRender('slide', 'slides'),
  sectionSkeleton: buildSkeletonRender('section', 'sections'),
  chapterSkeleton: buildSkeletonRender('chapter', 'chapters'),
  agendaSkeleton: buildSkeletonRender('agenda item', 'agenda items'),
  pageSkeleton: buildSkeletonRender('page', 'pages'),
  sceneSkeleton: buildSkeletonRender('scene', 'scenes'),
};

// Merge skeleton renders into authority renders for unified lookup
Object.assign(AUTHORITY_RICH_RENDERS, SKELETON_RICH_RENDERS);

function formatContentTypeInputs(
  inputs: Record<string, string | string[] | number | boolean> | undefined,
  typeId: string | null,
): string {
  if (!typeId || !inputs || Object.keys(inputs).length === 0) return '';
  const fields = getContentTypeInputs(typeId);
  const lines = fields
    // Skip keys that formatMediumConfig handles richly — avoid duplicate
    // "- Tone: professional" + "- Tone: Write in a professional voice."
    .filter((f) => !MEDIUM_CONFIG_HANDLED_KEYS.has(f.key))
    // W2 — product-select-velden bevatten een rauwe Product-id (cuid). Die
    // mag NOOIT als "- Gekoppeld product: clx123…" de prompt in lekken; de
    // product-context komt rijk via Layer 7 (ctx.products). Skippen.
    .filter((f) => f.type !== 'product-select')
    .filter((f) => inputs[f.key] != null && inputs[f.key] !== '')
    .map((f) => {
      const val = inputs[f.key];
      // Special-case hookFormat: enrich with the per-value instruction
      // so the AI doesn't treat the slug as a label-only hint.
      if (f.key === 'hookFormat' && typeof val === 'string') {
        return buildHookFormatLine(val);
      }
      // Authority-frame + narrative-anchor rich renders — see comment on
      // AUTHORITY_RICH_RENDERS map.
      const richRenderer = AUTHORITY_RICH_RENDERS[f.key];
      if (richRenderer && typeof val === 'string' && val.trim().length > 0) {
        return richRenderer(val);
      }
      const display = Array.isArray(val) ? (val as string[]).join(', ') : String(val);
      return `- ${f.label}: ${display}`;
    });
  if (lines.length === 0) return '';
  return `\n## Content-Specific Inputs\nUse these inputs to make the content specific and actionable. For example, if SEO keywords are provided, naturally incorporate them. If a landing page URL is specified, use it in the CTA. **The Hook Format instruction (when present) governs the opening line(s). The Unique Angle / Counter-Claim / Pivot Moment / Why Now instructions (when present) govern the H1, lead-paragraph, and overall narrative structure — they override any generic "engaging intro" or "comprehensive guide" defaults.**\n${lines.join('\n')}`;
}

/**
 * Merge mediumConfig (Step 3) and contentTypeInputs (Step 1) into a single
 * map for formatMediumConfig. Content-styling fields used to live in
 * mediumConfig only; after the 9.0c migration they travel via
 * contentTypeInputs but the prompt-injection logic stays in
 * formatMediumConfig (rich instructions per key). contentTypeInputs wins
 * on conflict because it's the user's most recent intent (Step 1 form).
 */
function formatMergedMediumConfig(
  mediumConfig: Record<string, unknown> | undefined,
  contentTypeInputs: Record<string, string | string[] | number | boolean> | undefined,
): string {
  const merged: Record<string, unknown> = { ...(mediumConfig ?? {}) };
  if (contentTypeInputs) {
    for (const key of MEDIUM_CONFIG_HANDLED_KEYS) {
      const val = contentTypeInputs[key];
      if (val !== undefined && val !== null && val !== '') {
        merged[key] = val;
      }
    }
  }
  if (Object.keys(merged).length === 0) return '';
  return formatMediumConfig(merged);
}

// ─── Image Generation ─────────────────────────────────────

async function generateImages(
  prompts: string[],
  brandContext: BrandContextBlock,
  workspaceId: string,
): Promise<Array<ImageResult | null>> {
  const resolved = await resolveFeatureModel(workspaceId, 'canvas-image-generate');
  assertProvider(resolved, 'openai', 'canvas-image-generate');

  const client = getOpenAIClient();

  // Enrich prompts with brand visual identity
  const brandStyle = [
    brandContext.brandColors ? `Brand colors: ${brandContext.brandColors}.` : '',
    brandContext.brandImageryStyle ? `Imagery style: ${brandContext.brandImageryStyle}.` : '',
    brandContext.brandVisualSystem ? `Visual system: ${brandContext.brandVisualSystem}.` : (brandContext.brandDesignLanguage ? `Design language: ${brandContext.brandDesignLanguage}.` : ''),
  ]
    .filter(Boolean)
    .join(' ');

  const enrichedPrompts = prompts.map(
    (p) => `${p}${brandStyle ? ` Visual identity: ${brandStyle}` : ''}`,
  );

  // Generate images in parallel (DALL-E 3 supports n=1 per call)
  const results = await Promise.all(
    enrichedPrompts.map(async (prompt): Promise<ImageResult | null> => {
      try {
        const response = await client.images.generate({
          model: resolved.model || 'dall-e-3',
          prompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
        });

        const url = response.data?.[0]?.url;
        if (!url) return null;

        return { url, prompt };
      } catch (err) {
        console.error('[canvas-orchestrator] Image generation failed:', err instanceof Error ? err.message : err);
        return null;
      }
    }),
  );

  return results;
}

// ─── Variant Persistence ──────────────────────────────────

async function persistVariants(
  deliverableId: string,
  workspaceId: string,
  textResult: TextGenerationResult,
  imageResults: Array<ImageResult | null>,
  meta: { provider: string; textDurationMs: number; imageDurationMs: number },
  publishSuggestion: PublishSuggestion | null,
  /** Content-type id for type-specific post-processing (e.g. linkedin-poll
   *  char-cap on question / option-* groups). Nullable for callers that
   *  don't have it in scope; type-specific branches are skipped. */
  contentTypeId: string | null,
): Promise<{
  imageComponentIds: string[];
  sanitizationWarnings: import('@/lib/content-test/checkpoint-gates').GateResult[];
  textComponentCount: number;
}> {
  const { validateSanitizationResult } = await import(
    '@/lib/content-test/checkpoint-gates'
  );
  const sanitizationWarnings: import('@/lib/content-test/checkpoint-gates').GateResult[] = [];
  let textComponentCount = 0;
  // Persist creative-angle labels op Deliverable.settings.variantAngles
  // BEFORE de transaction. Geen schema migration nodig — settings is een
  // bestaand Json veld. Bij page-reload haalt CanvasPage hydrate-flow dit
  // op en hangt angleLabel terug aan de geladen variants.
  const variantAngles = extractVariantAngles(textResult);
  if (variantAngles.length > 0) {
    try {
      const existing = await prisma.deliverable.findUnique({
        where: { id: deliverableId },
        select: { settings: true },
      });
      const currentSettings = (existing?.settings as Record<string, unknown> | null) ?? {};
      await prisma.deliverable.update({
        where: { id: deliverableId },
        data: {
          settings: { ...currentSettings, variantAngles },
        },
      });
    } catch (err) {
      // Non-fatal — variants persist normaal, alleen labels gaan verloren
      console.warn('[canvas-orchestrator] variantAngles persist failed:', (err as Error).message);
    }
  }

  const imageComponentIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    // Delete all existing components for fresh generation
    await tx.deliverableComponent.deleteMany({
      where: { deliverableId },
    });

    // Create text components
    let order = 0;
    for (const component of textResult.components) {
      for (let variantIndex = 0; variantIndex < component.variants.length; variantIndex++) {
        const variant = component.variants[variantIndex];
        // Sanitize content per group: title/meta/cta are plain text only,
        // body/hook preserve markdown. Defense-in-depth — the prompt asks
        // for this but models still leak # and wall-of-text CTAs.
        const normalizedContent = sanitizeVariantContent(variant.content, component.group);
        const normalizedCta = variant.cta
          ? sanitizeVariantContent(variant.cta, 'cta')
          : null;
        // ── Checkpoint-gate [5] validateSanitizationResult (sub-sprint #6.A) ──
        // Per-variant comparison pre/post sanitize. Block bij empty post-
        // sanitize (data-loss), warn bij >50% size-shrink of fence-leakage.
        const sanGate = validateSanitizationResult(variant.content, normalizedContent);
        if (!sanGate.pass) {
          if (sanGate.severity === 'block') {
            throw new Error(
              `Sanitization gate blocked variant ${component.group}[${variantIndex}]: ${sanGate.reasons.join(' · ')}`,
            );
          }
          sanitizationWarnings.push(sanGate);
        }
        const cappedContent = applyPollCharCap(normalizedContent, component.group, contentTypeId);
        textComponentCount++;
        await tx.deliverableComponent.create({
          data: {
            deliverableId,
            componentType: component.group,
            groupType: 'variant',
            order: order++,
            variantGroup: component.group,
            variantIndex,
            isSelected: variantIndex === 0,
            generatedContent: cappedContent,
            visualBrief: normalizedCta ? JSON.stringify({ cta: normalizedCta }) : null,
            aiProvider: meta.provider,
            generationDuration: meta.textDurationMs,
            aiModel: null,
            status: 'GENERATED',
            generatedAt: new Date(),
            iterationCount: 0,
          },
        });
      }
    }

    // Create image components — capture IDs so the caller can trigger
    // visual fidelity scoring (G8) after the transaction commits.
    const successfulImages = imageResults.filter((r): r is ImageResult => r !== null);
    for (let variantIndex = 0; variantIndex < successfulImages.length; variantIndex++) {
      const img = successfulImages[variantIndex];
      const created = await tx.deliverableComponent.create({
        data: {
          deliverableId,
          componentType: 'image',
          groupType: 'variant',
          order: order++,
          variantGroup: 'visual',
          variantIndex,
          isSelected: variantIndex === 0,
          imageUrl: img.url,
          imageSource: 'ai_generated',
          imagePromptUsed: img.prompt,
          aiProvider: 'openai',
          generationDuration: meta.imageDurationMs,
          status: 'GENERATED',
          generatedAt: new Date(),
          iterationCount: 0,
        },
        select: { id: true },
      });
      imageComponentIds.push(created.id);
    }

    // Update deliverable with publish suggestion (clear stale date if null)
    await tx.deliverable.update({
      where: { id: deliverableId },
      data: { suggestedPublishDate: publishSuggestion?.date ?? null },
    });
  });

  // Invalidate caches
  invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));
  invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

  return { imageComponentIds, sanitizationWarnings, textComponentCount };
}

/**
 * LinkedIn poll char limits are hard platform cutoffs (option > 30 chars
 * truncates on mobile; question > 140 chars is rejected by the LinkedIn
 * poll composer). Models often overshoot despite explicit prompt
 * instructions, so we cap server-side as a vangnet. The ellipsis suffix
 * signals the limit was hit so the user can shorten and regenerate or
 * inline-edit. Shared between initial persist and regenerate persist.
 */
function applyPollCharCap(
  content: string,
  group: string,
  contentTypeId: string | null,
): string {
  if (contentTypeId !== 'linkedin-poll') return content;
  const trimmed = content.trim();
  if (group === 'question' && trimmed.length > 140) {
    return trimmed.slice(0, 139) + '…';
  }
  if (/^option-[1-4]$/.test(group) && trimmed.length > 30) {
    return trimmed.slice(0, 29) + '…';
  }
  return content;
}

async function persistRegeneratedGroup(
  deliverableId: string,
  workspaceId: string,
  group: string,
  textGroup: TextComponentGroup | null,
  imageResults: Array<ImageResult | null> | null,
  maxIterationHint: number,
  contentTypeId: string | null,
  meta?: { provider: string; durationMs?: number },
): Promise<{ imageComponentIds: string[] }> {
  const imageComponentIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    // Fetch current group components inside transaction to avoid stale data
    const groupComponents = await tx.deliverableComponent.findMany({
      where: { deliverableId, variantGroup: group },
      select: { id: true, iterationCount: true, order: true },
    });
    const maxIteration = groupComponents.reduce(
      (max, c) => Math.max(max, c.iterationCount),
      maxIterationHint,
    );
    // Reuse the group's lowest existing order so a regenerate keeps the
    // component in place — maxOrder+1 permanently pushed the group to the
    // end of the deliverable (prompt-audit 2026-06-11).
    const existingMinOrder = groupComponents.length > 0
      ? Math.min(...groupComponents.map((c) => c.order))
      : null;

    // Delete existing components for this group
    await tx.deliverableComponent.deleteMany({
      where: { deliverableId, variantGroup: group },
    });

    let order: number;
    if (existingMinOrder !== null) {
      order = existingMinOrder;
    } else {
      // New group (nothing to replace) — append after the current max.
      const maxOrder = await tx.deliverableComponent.findFirst({
        where: { deliverableId },
        orderBy: { order: 'desc' },
        select: { order: true },
      });
      order = (maxOrder?.order ?? -1) + 1;
    }

    if (textGroup) {
      // Persist text variants — sanitize per group (plain text vs markdown).
      for (let variantIndex = 0; variantIndex < textGroup.variants.length; variantIndex++) {
        const variant = textGroup.variants[variantIndex];
        const normalizedContent = sanitizeVariantContent(variant.content, group);
        const normalizedCta = variant.cta
          ? sanitizeVariantContent(variant.cta, 'cta')
          : null;
        await tx.deliverableComponent.create({
          data: {
            deliverableId,
            componentType: group,
            groupType: 'variant',
            order: order++,
            variantGroup: group,
            variantIndex,
            isSelected: variantIndex === 0,
            generatedContent: applyPollCharCap(normalizedContent, group, contentTypeId),
            visualBrief: normalizedCta ? JSON.stringify({ cta: normalizedCta }) : null,
            aiProvider: meta?.provider ?? null,
            generationDuration: meta?.durationMs ?? 0,
            status: 'GENERATED',
            generatedAt: new Date(),
            iterationCount: maxIteration + 1,
          },
        });
      }
    }

    if (imageResults) {
      // Persist image variants — capture IDs so the caller can score them
      // via runVisualFidelityScoring after the transaction commits.
      const successfulImages = imageResults.filter((r): r is ImageResult => r !== null);
      for (let variantIndex = 0; variantIndex < successfulImages.length; variantIndex++) {
        const img = successfulImages[variantIndex];
        const created = await tx.deliverableComponent.create({
          data: {
            deliverableId,
            componentType: 'image',
            groupType: 'variant',
            order: order++,
            variantGroup: group,
            variantIndex,
            isSelected: variantIndex === 0,
            imageUrl: img.url,
            imageSource: 'ai_generated',
            imagePromptUsed: img.prompt,
            aiProvider: 'openai',
            generationDuration: meta?.durationMs ?? 0,
            status: 'GENERATED',
            generatedAt: new Date(),
            iterationCount: maxIteration + 1,
          },
          select: { id: true },
        });
        imageComponentIds.push(created.id);
      }
    }
  });

  invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));
  invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

  return { imageComponentIds };
}

// ─── Visual Brief — rich style-direction mapping ──────────────────────
//
// Replaces the old single-line "- Visual style: lifestyle." injection.
// Every chip emits explicit guidance for both text-generation (so the
// AI matches its prose to the visual mood — e.g. infographic = data-led,
// short captions; lifestyle = narrative, sensory) AND for image-prompt
// generation (so DALL-E / Imagen / FLUX get concrete composition rules).

const VISUAL_STYLE_TEXT_INSTRUCTIONS: Record<VisualStyleDirection, string> = {
  lifestyle:
    'Match the visual\'s narrative-led energy. Write in scenes — situate the reader in a real moment. Sensory details over abstract claims. Keep paragraphs flowing, not bulleted.',
  'product-shot':
    'The image is hero-product focused. Lead copy with the product\'s clearest benefit. Tight, declarative sentences. No long anecdotes — the visual already does the seducing.',
  'quote-text':
    'The visual is typography-led; the quote IS the content. Punch up the headline / hook. Body copy stays minimal. Aim for memorable, repeatable phrasing.',
  'behind-the-scenes':
    'The image is candid / process-focused. Use first-person voice ("we", "our team"). Be honest about the work, not glossy. Imperfect details build trust.',
  ugc: 'The image looks user-shot (handheld, raw). Write copy that reads like a real customer wrote it — natural sentence rhythm, no marketing polish, no hype words.',
  infographic:
    'The visual carries the data. Keep prose minimal — short callouts, key numbers in bold. Structure: claim → stat → implication. Avoid filler sentences that the chart already makes.',
  illustration:
    'The visual is drawn / vector. Match it with confident, approachable copy. Slightly playful tone is fine. Concrete metaphors land well alongside illustration.',
  'data-driven':
    'Numbers carry the argument. Lead with the headline number, then context, then implication. Hedge sparingly. Cite sources where critical.',
};

// VISUAL_STYLE_IMAGE_INSTRUCTIONS is imported from ./visual-brief-prompts —
// it's shared with the /api/studio/[id]/generate-visual endpoint so both
// call sites use the same chip → composition rule mapping.

/**
 * Format the Visual Brief as a system-prompt block. Returns empty string
 * when no brief is set or no direction has been chosen — the orchestrator
 * runs unchanged in that case (backward compat for old deliverables).
 */
function formatVisualBrief(brief: VisualBrief | null): string {
  if (!brief) return '';
  if (brief.source === 'none') {
    return '\n## Visual Direction\n(No visual will be produced for this content item — focus all output on the text components.)';
  }
  const chip = brief.styleDirection;
  const freeText = brief.styleDirectionFreeText?.trim() ?? '';
  if (!chip && !freeText) return '';
  const lines = ['\n## Visual Direction'];
  if (chip) {
    const label = chip.replace(/-/g, ' ');
    lines.push(`Visual style: **${label}**.`);
    lines.push(VISUAL_STYLE_TEXT_INSTRUCTIONS[chip]);
  }
  if (freeText) {
    lines.push(`Additional direction: ${freeText}`);
  }
  return lines.join('\n');
}

/**
 * Build the imagePrompt instruction line. When a visual brief is set with
 * a chip, inject the chip's image-side mapping directly into the prompt
 * the AI uses to write image generation prompts — Claude no longer needs
 * to infer composition from the brand context alone.
 */
function buildImagePromptInstruction(brief: VisualBrief | null): string {
  const baseInstruction =
    '\n\nAlso generate 2 "imagePrompts" — detailed image generation prompts that match the brand visual identity. Each prompt should describe the image in detail including style, composition, and mood.';
  // F36 (audit 2026-05-13): expliciete no-text guard zodat het text-LLM
  // óók in zijn imagePrompts beschrijvingen geen quoted captions / CTA
  // text injecteert die downstream image-model als overlay rendert.
  const noTextGuard =
    '\n\nIMPORTANT for imagePrompts: NEVER include quoted captions, slogans, CTA-text, signage strings or typography instructions in the prompt. The output image must be purely photographic — no embedded text, no words on screens or surfaces, no overlay. Describe scene, mood, composition only.';
  if (!brief || brief.source === 'none') return baseInstruction + noTextGuard;

  const chipGuide = brief.styleDirection
    ? `\n\nIMAGE STYLE — apply this composition to BOTH imagePrompts:\n${VISUAL_STYLE_IMAGE_INSTRUCTIONS[brief.styleDirection]}`
    : '';
  const freeTextGuide = brief.styleDirectionFreeText?.trim()
    ? `\nAdditional visual direction from the user: ${brief.styleDirectionFreeText.trim()}`
    : '';
  return baseInstruction + chipGuide + freeTextGuide + noTextGuard;
}

// ─── G8 visual fidelity scoring (Phase 2 wire-in) ────────────

/**
 * Score every freshly-generated image component against brand visual identity.
 *
 * Strategy: parallel `Promise.all` so total latency = max(individual)
 * instead of sum. Each call costs ~$0.04 (Claude Sonnet vision). Failures
 * surface as `score: null` in the result array — UI shows skipped state.
 *
 * Yields:
 *   - `visual_fidelity_running`  payload: { componentIds: string[] }
 *   - `visual_fidelity_complete` payload: { results: Array<{ componentId, compositeScore, thresholdMet, judgeSkipped, error?: string }> }
 */
async function* runVisualFidelityScoring(
  workspaceId: string,
  imageComponentIds: string[],
): AsyncGenerator<OrchestrationEvent> {
  yield {
    event: 'visual_fidelity_running',
    data: { componentIds: imageComponentIds },
  };

  const settled = await Promise.allSettled(
    imageComponentIds.map((componentId) =>
      scoreImageFidelity({ componentId, workspaceId }),
    ),
  );

  const results = settled.map((s, i) => {
    if (s.status === 'fulfilled') {
      return {
        componentId: imageComponentIds[i],
        compositeScore: s.value.compositeScore,
        thresholdMet: s.value.thresholdMet,
        judgeSkipped: s.value.judgeSkipped,
      };
    }
    const message = s.reason instanceof Error ? s.reason.message : String(s.reason);
    console.warn(
      `[canvas-orchestrator] visual fidelity scoring failed for ${imageComponentIds[i]}: ${message}`,
    );
    return {
      componentId: imageComponentIds[i],
      compositeScore: null,
      thresholdMet: false,
      judgeSkipped: true,
      error: message,
    };
  });

  yield {
    event: 'visual_fidelity_complete',
    data: { results },
  };
}
