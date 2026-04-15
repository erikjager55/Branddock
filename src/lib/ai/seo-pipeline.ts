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
import {
  SEO_STEP_DEFINITIONS,
  type SeoInput,
  type SeoPipelineState,
  type SeoChecklist,
  type SeoStepEvent,
  type PublicationPrep,
  type EditorialReview,
  type KeywordResearch,
} from './seo-pipeline.types';
import type { PersonaContext, BriefContext, ProductContext } from './canvas-context';

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
): AsyncGenerator<OrchestrationEvent> {
  const startTime = Date.now();

  // Build context strings from canvas stack
  const brandContext = formatBrandContext(stack.brand);
  const personaContext = formatPersonas(stack.personas);
  const productContext = formatProducts(stack.products);
  const briefContext = formatBrief(stack.brief);

  // Resolve AI model for text generation
  const textModel = await resolveFeatureModel(workspaceId, 'canvas-text-generate');

  // Pipeline state accumulator
  const state: SeoPipelineState = {
    outputs: [],
    accumulatedContext: '',
  };

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

    // Signal step start
    yield { event: 'seo_step', data: stepEvent };

    try {
      let rawOutput: string;

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
        );
      }

      // Accumulate output
      state.outputs.push({
        step: stepDef.step,
        name: stepDef.name,
        rawText: rawOutput,
      });
      state.accumulatedContext += `\n\n## Step ${stepDef.step}: ${stepDef.label}\n${rawOutput}\n---`;

      // Signal step complete
      const preview = generatePreview(stepDef.step, rawOutput);
      yield {
        event: 'seo_step',
        data: { ...stepEvent, status: 'complete' as const, preview },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[seo-pipeline] Step ${stepDef.step} (${stepDef.name}) failed:`, message);

      yield {
        event: 'seo_step',
        data: { ...stepEvent, status: 'error' as const, preview: message },
      };

      yield {
        event: 'error',
        data: { message: `SEO pipeline failed at step ${stepDef.step} (${stepDef.label}): ${message}`, recoverable: false },
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
      // Delete existing components
      await tx.deliverableComponent.deleteMany({
        where: { deliverableId },
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

  const result = await createStructuredCompletion(
    textModel.provider,
    textModel.model,
    systemPrompt,
    userPrompt,
    { timeoutMs: 120_000 },
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
): Promise<string> {
  // Step 6 produces markdown, not JSON — use non-structured completion
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

  const result = await createStructuredCompletion(
    textModel.provider,
    textModel.model,
    systemPrompt,
    userPrompt,
    { timeoutMs: 180_000 },
  );

  return extractText(result);
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
  );

  return extractText(result);
}

// ─── Variant B Generator ─────────────────────────────────────

async function generateAlternativeVariant(
  originalContent: string,
  accumulatedResearch: string,
  voiceDirective: string,
  textModel: ResolvedModel,
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

Output the complete alternative page in markdown format. Do NOT output JSON.
${voiceDirective}`;

  const userPrompt = `## ORIGINAL PAGE (Variant A)
${originalContent}

## SEO RESEARCH CONTEXT (preserve all SEO elements from this research)
${accumulatedResearch.slice(-20000)}

Write the complete alternative version (Variant B). Different creative angle, same SEO foundation.`;

  const result = await createStructuredCompletion(
    textModel.provider,
    textModel.model,
    systemPrompt,
    userPrompt,
    { timeoutMs: 180_000 },
  );

  return extractText(result);
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
