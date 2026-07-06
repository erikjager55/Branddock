// =============================================================
// SEO Pipeline Engine
//
// 8-step sequential pipeline that runs inside the Content Canvas
// for website deliverable types. Each step accumulates context
// from all previous steps and yields SSE progress events.
//
// After all 8 steps, generates 2 content variants and persists
// them as DeliverableComponent records (same format as canvas).
// =============================================================

import { prisma } from '@/lib/prisma';
import type { CanvasContextStack } from './canvas-context';
import type { OrchestrationEvent } from './canvas-orchestrator';
import { createStructuredCompletion } from './exploration/ai-caller';
import { resolveFeatureModel } from './feature-models.server';
import { formatBrandContext, type BrandContextBlock } from './prompt-templates';
import { searchWithGrounding } from './gemini-client';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { buildSeoStepPrompt } from './prompts/seo-prompts';
import { buildAiErrorEvent } from './error-handler';
import {
  SEO_STEP_DEFINITIONS,
  type SeoInput,
  type SeoPipelineState,
  type SeoChecklist,
  type SeoStepEvent,
  type PublicationPrep,
  type EditorialReview,
  type KeywordResearch,
  type OptimizationGoal,
} from './seo-pipeline.types';
import type { PersonaContext, BriefContext, ProductContext } from './canvas-context';
import { runGeoPolish, shouldApplyGeoPolish } from './geo-polish';

// ─── Context Formatters (reuse canvas-orchestrator patterns) ─

function formatPersonas(personas: PersonaContext[]): string {
  if (personas.length === 0) return '';
  const parts = ['## Target Personas'];
  for (const p of personas) {
    parts.push(`\n### ${p.name}`);
    if (p.serialized) parts.push(p.serialized);
  }
  return parts.join('\n');
}

function formatBrief(brief: BriefContext | null): string {
  if (!brief) return '';
  const parts = ['## Content Brief'];
  if (brief.objective) parts.push(`Objective: ${brief.objective}`);
  if (brief.keyMessage) parts.push(`Key Message: ${brief.keyMessage}`);
  if (brief.toneDirection) parts.push(`Tone Direction: ${brief.toneDirection}`);
  if (brief.callToAction) parts.push(`Call to Action: ${brief.callToAction}`);
  if (brief.contentOutline.length > 0) {
    parts.push(`Content Outline:\n${brief.contentOutline.map((item) => `- ${item}`).join('\n')}`);
  }
  return parts.length > 1 ? parts.join('\n') : '';
}

function formatProducts(products: ProductContext[]): string {
  if (products.length === 0) return '';
  const parts = ['## Products & Services'];
  for (const p of products) {
    parts.push(`\n### ${p.name}`);
    if (p.description) parts.push(`Description: ${p.description}`);
    if (p.category) parts.push(`Category: ${p.category}`);
    if (p.features.length > 0) parts.push(`Features:\n${p.features.map((f) => `- ${f}`).join('\n')}`);
    if (p.benefits.length > 0) parts.push(`Benefits:\n${p.benefits.map((b) => `- ${b}`).join('\n')}`);
  }
  return parts.join('\n');
}

// ─── Main Pipeline ───────────────────────────────────────────

export async function* runSeoPipeline(
  deliverableId: string,
  workspaceId: string,
  seoInput: SeoInput,
  stack: CanvasContextStack,
  voiceDirective: string,
  contentType: string,
  // GEO/SEO Fase 3 — composable stage: bij het seo-geo-profiel op long-form
  // krijgt de SEO-output een GEO-polish vóór persist. Default [] = puur SEO
  // (byte-identiek aan vóór Fase 3; kill-switch via deze lijst).
  optimizationGoals: OptimizationGoal[] = [],
  // Resumable decompose: al-voltooide stappen zitten hierin → de loop slaat ze
  // over (skip AI-call) zodat een continuation-job vanaf de checkpoint verdergaat.
  initialState?: SeoPipelineState,
): AsyncGenerator<OrchestrationEvent> {
  const startTime = Date.now();

  // Build context strings from canvas stack
  const brandContext = formatBrandContext(stack.brand);
  const personaContext = formatPersonas(stack.personas);
  const productContext = formatProducts(stack.products);
  const briefContext = formatBrief(stack.brief);

  // Resolve AI model for text generation
  const textModel = await resolveFeatureModel(workspaceId, 'canvas-text-generate');

  // Pipeline state accumulator — hydrateer vanaf een checkpoint (resume) of leeg.
  const state: SeoPipelineState = initialState
    ? { outputs: [...initialState.outputs], accumulatedContext: initialState.accumulatedContext }
    : { outputs: [], accumulatedContext: '' };

  // ── Run 8 sequential steps ─────────────────────────────

  for (const stepDef of SEO_STEP_DEFINITIONS) {
    const stepEvent: SeoStepEvent = {
      step: stepDef.step,
      name: stepDef.name,
      label: stepDef.label,
      status: 'running',
      preview: null,
      totalSteps: 8,
    };

    // Resume: stap al voltooid in de checkpoint → skip de AI-call.
    if (state.outputs.some((o) => o.step === stepDef.step)) {
      yield { event: 'seo_step', data: { ...stepEvent, status: 'complete' as const } };
      continue;
    }

    // Signal step start
    yield { event: 'seo_step', data: stepEvent };

    try {
      let rawOutput: string;

      const stepTracking = { workspaceId, deliverableId };

      if (stepDef.step === 3) {
        // Step 3: Competitor analysis via Gemini search grounding
        rawOutput = await runCompetitorAnalysisStep(
          seoInput,
          state,
          brandContext,
          personaContext,
          productContext,
          briefContext,
          voiceDirective,
          contentType,
          textModel,
          stepTracking,
        );
      } else if (stepDef.step === 6) {
        // Step 6: First draft — returns markdown, not JSON
        rawOutput = await runDraftStep(
          stepDef.step,
          seoInput,
          state,
          brandContext,
          personaContext,
          productContext,
          briefContext,
          voiceDirective,
          contentType,
          textModel,
          stepTracking,
        );
      } else {
        // Steps 1, 2, 4, 5, 7, 8: structured JSON completion
        rawOutput = await runStructuredStep(
          stepDef.step,
          seoInput,
          state,
          brandContext,
          personaContext,
          productContext,
          briefContext,
          voiceDirective,
          contentType,
          textModel,
          stepTracking,
        );
      }

      // Accumulate output
      state.outputs.push({
        step: stepDef.step,
        name: stepDef.name,
        rawText: rawOutput,
      });
      state.accumulatedContext += `\n\n## Step ${stepDef.step}: ${stepDef.label}\n${rawOutput}\n---`;

      // Signal step complete + checkpoint de state (voor resume in een continuation).
      const preview = generatePreview(stepDef.step, rawOutput);
      yield {
        event: 'seo_step',
        data: { ...stepEvent, status: 'complete' as const, preview },
      };
      yield { event: 'seo_checkpoint', data: { state } };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[seo-pipeline] Step ${stepDef.step} (${stepDef.name}) failed:`, message);

      yield {
        event: 'seo_step',
        data: { ...stepEvent, status: 'error' as const, preview: message },
      };

      yield {
        event: 'error',
        data: {
          // Classify (unavailable/errorType) but keep the step-context message.
          ...buildAiErrorEvent(err, { recoverable: false }),
          message: `SEO pipeline failed at step ${stepDef.step} (${stepDef.label}): ${message}`,
        },
      };
      return;
    }
  }

  // ── Generate 2 variants from final output ──────────────

  const step8Output = state.outputs.find((o) => o.step === 8);
  if (!step8Output) {
    yield { event: 'error', data: { message: 'SEO pipeline completed but step 8 output is missing', recoverable: false } };
    return;
  }

  let finalContent: string;
  let seoChecklist: SeoChecklist | null = null;

  try {
    // Strip markdown code fences if present (AI sometimes wraps JSON in ```json ... ```)
    const cleanedText = step8Output.rawText
      .replace(/^```(?:json)?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim();
    const parsed = JSON.parse(cleanedText) as PublicationPrep;
    finalContent = parsed.finalContent;
    seoChecklist = parsed.checklist;
  } catch {
    console.warn('[seo-pipeline] Step 8 JSON parse failed, using raw text. SEO checklist will be unavailable.');
    finalContent = step8Output.rawText;
  }

  // Generate variant B — alternative angle using same SEO research
  let variantBContent: string;
  try {
    variantBContent = await generateAlternativeVariant(
      finalContent,
      state.accumulatedContext,
      voiceDirective,
      textModel,
      { workspaceId, deliverableId },
    );
  } catch {
    // Fallback: use the editorial review version (step 7) as variant B
    const step7Output = state.outputs.find((o) => o.step === 7);
    if (step7Output) {
      try {
        const parsed = JSON.parse(step7Output.rawText) as EditorialReview;
        variantBContent = parsed.revisedContent;
      } catch {
        variantBContent = step7Output.rawText;
      }
    } else {
      variantBContent = finalContent;
    }
  }

  // ── GEO-polish (composable stage, Fase 3) ──────────────
  // Alleen voor het seo-geo-profiel op long-form: herschrijf de SEO-output
  // answer-first/citeerbaar zonder de SEO-structuur te slopen. Fail-soft (geeft
  // bij fout de originele content terug) → kan de pipeline nooit breken. Bewust
  // long-form-only (ADR open vraag #2) om het productie-SEO-pad ongemoeid te laten.
  if (shouldApplyGeoPolish(optimizationGoals, contentType)) {
    // Stil polishen — geen extra seo_step-event om de 8-stap frontend-tracker
    // niet te verwarren; de gepolishte content komt mee in text_complete.
    const polishOpts = {
      locale: stack.brand.contentLanguage ?? 'en',
      voiceDirective,
      tracking: { workspaceId, deliverableId },
    };
    if (variantBContent === finalContent) {
      // Fallback-pad: variant B is een kopie van A → polish één keer i.p.v. twee
      // dubbele calls (kosten/latency + divergerende rewrites van dezelfde input).
      finalContent = await runGeoPolish(finalContent, textModel, polishOpts);
      variantBContent = finalContent;
    } else {
      [finalContent, variantBContent] = await Promise.all([
        runGeoPolish(finalContent, textModel, polishOpts),
        runGeoPolish(variantBContent, textModel, polishOpts),
      ]);
    }
  }

  // Yield text_complete events (same format as canvas-orchestrator)
  yield {
    event: 'text_complete',
    data: {
      group: 'body',
      variants: [
        { index: 0, content: finalContent, tone: 'seo-optimized', cta: null },
        { index: 1, content: variantBContent, tone: 'seo-alternative', cta: null },
      ],
    },
  };

  // ── Persist variants + SEO checklist ───────────────────

  try {
    const textDurationMs = Date.now() - startTime;

    await prisma.$transaction(async (tx) => {
      // Delete existing TEXT components only. Media-rijen (hero-image /
      // visual / visual:<scene> / feature-visual:<i> / video / voiceover)
      // zijn producten van aparte flows en moeten een SEO-rerun overleven —
      // de eerdere wipe-all verwijderde o.a. de hero-image-rij, waardoor de
      // Planner-checklist "Hero image added" false-negative gaf (audit
      // 2026-06-10). Zelfde notIn-conventie als canvas-orchestrator.
      await tx.deliverableComponent.deleteMany({
        where: { deliverableId, componentType: { notIn: ['image', 'video', 'voiceover'] } },
      });

      // Create 2 text variants
      const variants = [finalContent, variantBContent];
      for (let variantIndex = 0; variantIndex < variants.length; variantIndex++) {
        await tx.deliverableComponent.create({
          data: {
            deliverableId,
            componentType: 'body',
            groupType: 'variant',
            order: variantIndex,
            variantGroup: 'body',
            variantIndex,
            isSelected: variantIndex === 0,
            generatedContent: variants[variantIndex],
            aiProvider: textModel.provider,
            generationDuration: textDurationMs,
            aiModel: textModel.model,
            status: 'GENERATED',
            generatedAt: new Date(),
            iterationCount: 0,
          },
        });
      }

      // Store SEO checklist + write back AI-generated data to contentTypeInputs
      const existingSettings = (await tx.deliverable.findUnique({
        where: { id: deliverableId },
        select: { settings: true },
      }))?.settings;

      const currentSettings = existingSettings && typeof existingSettings === 'object'
        ? existingSettings as Record<string, unknown>
        : {};

      // Merge AI-generated SEO data back into contentTypeInputs
      const currentInputs = (currentSettings.contentTypeInputs ?? {}) as Record<string, unknown>;
      const updatedInputs = { ...currentInputs };

      // Write back Step 2 keyword research results
      const step2Output = state.outputs.find((o) => o.step === 2);
      if (step2Output) {
        try {
          const kwData = JSON.parse(step2Output.rawText) as KeywordResearch;
          if (!updatedInputs.seoKeyword && kwData.primaryKeyword) {
            updatedInputs.seoKeyword = kwData.primaryKeyword;
          }
          if (Array.isArray(kwData.supportingKeywords) && kwData.supportingKeywords.length > 0) {
            // Only write if user hasn't manually provided secondary keywords
            const existing = updatedInputs.secondaryKeywords;
            if (!existing || (Array.isArray(existing) && existing.length === 0)) {
              updatedInputs.secondaryKeywords = kwData.supportingKeywords;
            }
          }
        } catch { /* ignore parse failure — keyword writeback is best-effort */ }
      }

      // Write back Step 8 meta description + title tag
      // Only write meta description if user hasn't provided one
      if (seoChecklist?.metaDescription && !updatedInputs.metaDescription) {
        updatedInputs.metaDescription = seoChecklist.metaDescription;
      }

      const updatedSettings: Record<string, unknown> = {
        ...currentSettings,
        ...(seoChecklist ? { seoChecklist } : {}),
        contentTypeInputs: updatedInputs,
      };

      await tx.deliverable.update({
        where: { id: deliverableId },
        data: {
          settings: JSON.parse(JSON.stringify(updatedSettings)),
        },
      });
    });

    invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown persistence error';
    console.error('[seo-pipeline] persistVariants failed:', message);
    yield {
      event: 'error',
      data: { message: `Failed to save SEO content: ${message}`, recoverable: true },
    };
    return;
  }

  // ── Complete ───────────────────────────────────────────

  yield {
    event: 'complete',
    data: { totalDuration: Date.now() - startTime, componentCount: 2 },
  };
}

// ─── Step Runners ────────────────────────────────────────────

import type { ResolvedModel } from './feature-models';

/** Extract text from an AI completion result (handles string, Anthropic Message, and parsed JSON) */
function extractText(result: unknown): string {
  if (!result) throw new Error('AI returned empty response');
  if (typeof result === 'string') return result;
  if (typeof result === 'object' && result !== null) {
    const obj = result as Record<string, unknown>;
    if ('content' in obj && Array.isArray(obj.content)) {
      const textBlock = (obj.content as Array<{ type: string; text?: string }>).find(
        (b) => b.type === 'text',
      );
      if (textBlock?.text) return textBlock.text;
    }
    return JSON.stringify(result);
  }
  return String(result);
}

// 2026-05-24: Per-step budget (maxTokens + timeout) voor late pipeline
// aggregate-steps die ALLE voorgaande step-outputs samenbrengen in één
// JSON output. Earlier steps blijven op caller defaults (16K / 120s).
//
// Token-keuze: Step 8 hit 8K met 16749 chars (~5500 tokens); 32K geeft
// ~4× headroom. Step 5/7 zitten typisch tussen 8K-16K op aggregate
// outputs; 24K geeft 1.5-3× headroom. Step 6 draagt de volledige page-
// draft in een JSON-envelope (~15% escaping-overhead) — zelfde payload-
// klasse als step 7, dus zelfde budget.
//
// Timeout-keuze: Opus 4.7 met thinking + 32K output kan 3-5 min duren.
// Vorige 120s default abortte mid-stream; 300s = 5 min is veilige
// productie-marge. Beneden Anthropic's 10-min hard-limit op non-
// streaming requests.
interface StepBudget {
  maxTokens: number;
  timeoutMs: number;
}

const STEP_BUDGETS: Record<number, StepBudget> = {
  5: { maxTokens: 24000, timeoutMs: 240_000 },  // Outline & Internal Links
  6: { maxTokens: 24000, timeoutMs: 240_000 },  // First Draft (full page in JSON envelope)
  7: { maxTokens: 24000, timeoutMs: 240_000 },  // Editorial Review
  8: { maxTokens: 32000, timeoutMs: 300_000 },  // Publication Prep (aggregator)
};

/**
 * Extracts the markdown draft from the `{ "draft": "..." }` JSON envelope
 * that the step-6 and variant-B prompts request. Accepts a bare string as
 * defensive fallback (model returned the markdown as a JSON string).
 */
function extractDraft(result: unknown): string {
  if (typeof result === 'string' && result.trim()) return result;
  if (result && typeof result === 'object') {
    const draft = (result as Record<string, unknown>).draft;
    if (typeof draft === 'string' && draft.trim()) return draft;
  }
  throw new Error('AI draft response is missing the "draft" field');
}

async function runStructuredStep(
  step: number,
  seoInput: SeoInput,
  state: SeoPipelineState,
  brandContext: string,
  personaContext: string,
  productContext: string,
  briefContext: string,
  voiceDirective: string,
  contentType: string,
  textModel: ResolvedModel,
  stepTracking?: { workspaceId: string; deliverableId: string },
): Promise<string> {
  const ctx = {
    brandContext,
    personaContext,
    productContext,
    briefContext,
    seoInput,
    voiceDirective,
    contentType,
    accumulatedOutputs: state.accumulatedContext,
  };

  const { systemPrompt, userPrompt } = buildSeoStepPrompt(step, ctx);
  const budget = STEP_BUDGETS[step];
  const maxTokens = budget?.maxTokens; // undefined → caller default (16K)
  const timeoutMs = budget?.timeoutMs ?? 120_000;

  const result = await createStructuredCompletion(
    textModel.provider,
    textModel.model,
    systemPrompt,
    userPrompt,
    { timeoutMs, maxTokens },
    stepTracking
      ? {
          workspaceId: stepTracking.workspaceId,
          parentEntityType: 'Deliverable',
          parentEntityId: stepTracking.deliverableId,
          callOrder: step,
          sourceIdentifier: `src/lib/ai/seo-pipeline.ts:runStructuredStep:${step}`,
        }
      : undefined,
  );

  return extractText(result);
}

async function runDraftStep(
  step: number,
  seoInput: SeoInput,
  state: SeoPipelineState,
  brandContext: string,
  personaContext: string,
  productContext: string,
  briefContext: string,
  voiceDirective: string,
  contentType: string,
  textModel: ResolvedModel,
  stepTracking?: { workspaceId: string; deliverableId: string },
): Promise<string> {
  // Step 6 produces a markdown draft wrapped in a `{ "draft": "..." }`
  // JSON envelope, so the structured-completion JSON contract holds.
  const ctx = {
    brandContext,
    personaContext,
    productContext,
    briefContext,
    seoInput,
    voiceDirective,
    contentType,
    accumulatedOutputs: state.accumulatedContext,
  };

  const { systemPrompt, userPrompt } = buildSeoStepPrompt(step, ctx);
  const budget = STEP_BUDGETS[step];

  const result = await createStructuredCompletion<{ draft: string }>(
    textModel.provider,
    textModel.model,
    systemPrompt,
    userPrompt,
    { timeoutMs: budget?.timeoutMs ?? 180_000, maxTokens: budget?.maxTokens },
    stepTracking
      ? {
          workspaceId: stepTracking.workspaceId,
          parentEntityType: 'Deliverable',
          parentEntityId: stepTracking.deliverableId,
          callOrder: step,
          sourceIdentifier: `src/lib/ai/seo-pipeline.ts:runDraftStep:${step}`,
        }
      : undefined,
  );

  return extractDraft(result);
}

async function runCompetitorAnalysisStep(
  seoInput: SeoInput,
  state: SeoPipelineState,
  brandContext: string,
  personaContext: string,
  productContext: string,
  briefContext: string,
  voiceDirective: string,
  contentType: string,
  textModel: ResolvedModel,
  stepTracking?: { workspaceId: string; deliverableId: string },
): Promise<string> {
  // Phase 1: Get live search results via Gemini search grounding
  let searchResults = '';
  try {
    const grounding = await searchWithGrounding(seoInput.primaryKeyword, 5);
    const urlList = grounding.urls.map((u, i) => `${i + 1}. ${u.url}${u.title ? ` — ${u.title}` : ''}`).join('\n');
    searchResults = `## Search Results\n${urlList}\n\n## AI Summary\n${grounding.responseText}`;
  } catch (err) {
    console.warn('[seo-pipeline] searchWithGrounding failed, continuing with limited data:', err);
    searchResults = 'Search grounding unavailable. Analyze based on general knowledge of the SERP for this keyword.';
  }

  // Phase 2: Structured analysis of the results
  const ctx = {
    brandContext,
    personaContext,
    productContext,
    briefContext,
    seoInput,
    voiceDirective,
    contentType,
    accumulatedOutputs: state.accumulatedContext,
  };

  const { systemPrompt, userPrompt } = buildSeoStepPrompt(3, ctx, searchResults);

  const result = await createStructuredCompletion(
    textModel.provider,
    textModel.model,
    systemPrompt,
    userPrompt,
    { timeoutMs: 120_000 },
    stepTracking
      ? {
          workspaceId: stepTracking.workspaceId,
          parentEntityType: 'Deliverable',
          parentEntityId: stepTracking.deliverableId,
          callOrder: 3,
          sourceIdentifier: 'src/lib/ai/seo-pipeline.ts:runCompetitorAnalysisStep',
        }
      : undefined,
  );

  return extractText(result);
}

// ─── Variant B Generator ─────────────────────────────────────

async function generateAlternativeVariant(
  originalContent: string,
  accumulatedResearch: string,
  voiceDirective: string,
  textModel: ResolvedModel,
  stepTracking?: { workspaceId: string; deliverableId: string },
): Promise<string> {
  const systemPrompt = `You are a Senior Conversion Copywriter creating an alternative version of an SEO-optimized page.

Your task: Rewrite the provided page content with a DIFFERENT creative angle while preserving:
- All SEO elements (keywords, heading structure, meta tags, internal links, FAQ)
- All E-E-A-T signals
- The same core message and conversion goal
- Brand voice and tone

What should be DIFFERENT in variant B:
- Different hook/opening angle (e.g., question vs. statistic vs. story vs. bold claim)
- Different benefit ordering (lead with a different primary benefit)
- Different social proof emphasis
- Different CTA framing (urgency vs. value vs. exclusivity)
- Different emotional register (while staying within brand voice guidelines)

OUTPUT FORMAT:
Respond with a JSON object matching this exact schema:
{
  "draft": "string — the complete alternative page in markdown"
}

The "draft" field is the ONLY field. Inside it, write the full alternative page in markdown.
Use sentence case for ALL headings (capitalize only first word + proper nouns, NEVER Title Case).
Preserve the official capitalization of every brand, product and company name (e.g., "Napking", "iPhone", "LinkedIn") — never lowercase or uppercase them unless the brand officially does so. Applies to headings, body, meta tags, alt text and CTAs.
Do NOT generate a table of contents with anchor links. Do NOT use --- horizontal rules.
${voiceDirective}`;

  const userPrompt = `## ORIGINAL PAGE (Variant A)
${originalContent}

## SEO RESEARCH CONTEXT (preserve all SEO elements from this research)
${accumulatedResearch.slice(-20000)}

Write the complete alternative version (Variant B). Different creative angle, same SEO foundation. Return the full markdown page in the "draft" field.`;

  const result = await createStructuredCompletion<{ draft: string }>(
    textModel.provider,
    textModel.model,
    systemPrompt,
    userPrompt,
    // Same payload class as step 6 (full page in JSON envelope) — same budget.
    { timeoutMs: 240_000, maxTokens: 24000 },
    stepTracking
      ? {
          workspaceId: stepTracking.workspaceId,
          parentEntityType: 'Deliverable',
          parentEntityId: stepTracking.deliverableId,
          callOrder: 99, // variant B generation runs after the 8-step pipeline
          sourceIdentifier: 'src/lib/ai/seo-pipeline.ts:generateAlternativeVariant',
        }
      : undefined,
  );

  return extractDraft(result);
}

// ─── Preview Generator ───────────────────────────────────────

function generatePreview(step: number, rawOutput: string): string {
  try {
    const parsed = JSON.parse(rawOutput);

    switch (step) {
      case 1:
        return parsed.pageGoal ? `Goal: ${String(parsed.pageGoal).slice(0, 80)}` : 'Briefing complete';
      case 2: {
        const kwCount = Array.isArray(parsed.supportingKeywords) ? parsed.supportingKeywords.length : 0;
        const ltCount = Array.isArray(parsed.longTailQuestions) ? parsed.longTailQuestions.length : 0;
        return `${kwCount} keywords, ${ltCount} long-tails`;
      }
      case 3: {
        const compCount = Array.isArray(parsed.competitors) ? parsed.competitors.length : 0;
        const avgLen = parsed.dominantLength ? ` ~${parsed.dominantLength} words` : '';
        return `${compCount} competitors analyzed${avgLen}`;
      }
      case 4: {
        const gapCount = Array.isArray(parsed.contentGaps) ? parsed.contentGaps.length : 0;
        return `${gapCount} content gaps, E-E-A-T mapped`;
      }
      case 5:
        return parsed.h1 ? `H1: "${String(parsed.h1).slice(0, 60)}"` : 'Outline complete';
      case 6:
        return `Draft written (${rawOutput.split(/\s+/).length} words)`;
      case 7: {
        const impCount = Array.isArray(parsed.improvements) ? parsed.improvements.length : 0;
        return `${impCount} improvements applied`;
      }
      case 8:
        return 'Final version + SEO checklist ready';
      default:
        return 'Complete';
    }
  } catch {
    // Non-JSON output (step 6 markdown)
    const wordCount = rawOutput.split(/\s+/).length;
    return step === 6 ? `Draft written (~${wordCount} words)` : 'Complete';
  }
}
