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
import { getDeliverableTypeById } from '@/features/campaigns/lib/deliverable-types';
import { getPromptTemplate } from '@/lib/studio/prompt-templates';
import { getContentTypeInputs } from '@/features/campaigns/lib/content-type-inputs';
import { buildBrandVoiceDirectiveFromContext } from '@/lib/studio/brand-voice-directive';
import { buildHumanVoiceDirective } from '@/lib/studio/human-voice-directive';
import { resolveHumanVoiceMode } from '@/lib/brand-fidelity/fidelity-config';
import { sanitizeVariantContent } from '@/features/campaigns/lib/variant-content-sanitizer';
import OpenAI from 'openai';

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
}

interface TextComponentGroup {
  group: string;
  variants: Array<{
    content: string;
    tone?: string;
    cta?: string;
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
  [key: string]: unknown;
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
  const stack = await assembleCanvasContext(deliverableId, workspaceId);

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

  // ── Determine component groups from template ──────────
  const componentTemplate = (stack.medium?.componentTemplate ?? []) as ComponentTemplateItem[];
  const textGroups = componentTemplate
    .filter((t) => t.type !== 'image' && t.type !== 'hero-image' && t.type !== 'sound')
    .map((t) => t.type);
  const hasImageComponent = componentTemplate.some(
    (t) => t.type === 'image' || t.type === 'hero-image',
  );

  // ── Build brand voice directive (BVD) + Human Voice Directive (HVD) ─
  const bvd = buildBrandVoiceDirectiveFromContext(stack.brand, {
    deliverableTypeId: stack.deliverableTypeId ?? undefined,
  });

  // F-VAL pijler 3: append generic anti-AI-tell layer when enabled
  const humanVoiceMode = await resolveHumanVoiceMode(workspaceId);
  const hvd =
    humanVoiceMode === 'OFF'
      ? ''
      : buildHumanVoiceDirective({ language: stack.brand.contentLanguage ?? 'nl' });

  const voiceDirective = hvd ? `${bvd}\n\n${hvd}` : bvd;

  // ── Regeneration path ─────────────────────────────────
  if (options?.regenerateGroup) {
    yield* handleRegeneration(deliverableId, workspaceId, stack, options, startTime, voiceDirective);
    return;
  }

  // ── SEO Pipeline path (website types with keyword) ───
  const deliverableTypeId = stack.deliverableTypeId ?? '';
  const { WEBSITE_DELIVERABLE_TYPES } = await import('./seo-pipeline.types');
  if (
    WEBSITE_DELIVERABLE_TYPES.has(deliverableTypeId) &&
    options?.seoInput?.primaryKeyword
  ) {
    const { runSeoPipeline } = await import('./seo-pipeline');
    yield* runSeoPipeline(
      deliverableId,
      workspaceId,
      options.seoInput,
      stack,
      voiceDirective,
      deliverableTypeId,
    );
    return;
  }

  // ── Step 2: Generate text components ──────────────────
  const { systemPrompt, userPrompt } = buildCanvasPrompt(stack, stack.medium, options, voiceDirective);
  const textModel = await resolveFeatureModel(workspaceId, 'canvas-text-generate');

  for (const group of textGroups) {
    yield { event: 'text_generating', data: { group, status: 'generating' } };
  }

  // Try primary provider first, fall back to other supported providers if
  // it errors out (Anthropic has intermittent 500s on claude-sonnet-4-5).
  // The order is: user's configured provider → remaining supported providers
  // so the configured choice is always attempted first.
  const textResult = await generateTextWithFallback(
    workspaceId,
    textModel.provider,
    textModel.model,
    systemPrompt,
    userPrompt,
    stack.deliverableTypeId,
  );

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
        })),
      },
    };
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
  try {
    await persistVariants(
      deliverableId,
      workspaceId,
      textResult,
      imageResults,
      { provider: textModel.provider, textDurationMs, imageDurationMs },
      publishSuggestion,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown persistence error';
    console.error('[canvas-orchestrator] persistVariants failed:', message);
    yield {
      event: 'error',
      data: { message: `Failed to save generated content: ${message}`, recoverable: true },
    };
    return;
  }

  // ── Complete ──────────────────────────────────────────
  const totalDuration = Date.now() - startTime;
  const componentCount =
    textResult.components.reduce((acc, c) => acc + c.variants.length, 0) +
    imageResults.filter((r) => r !== null).length;

  yield {
    event: 'complete',
    data: { totalDuration, componentCount },
  };
}

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

/** Resolve maxTokens based on content type — long-form needs much more */
function resolveMaxTokens(contentType: string | null): number {
  const longForm = new Set([
    'blog-post', 'pillar-page', 'whitepaper', 'case-study', 'ebook',
    'article', 'thought-leadership',
  ]);
  const mediumForm = new Set([
    'newsletter', 'welcome-sequence', 'nurture-sequence', 'sales-deck',
    'proposal-template', 'press-release', 'impact-report', 'career-page',
  ]);
  if (longForm.has(contentType ?? '')) return 16000;
  if (mediumForm.has(contentType ?? '')) return 8000;
  return 4000; // short-form: social posts, ads, carousels
}

async function generateTextWithFallback(
  workspaceId: string,
  primaryProvider: AiProvider,
  primaryModel: string,
  systemPrompt: string,
  userPrompt: string,
  contentType?: string | null,
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
      const result = await createStructuredCompletion<TextGenerationResult>(
        provider,
        model,
        systemPrompt,
        userPrompt,
        { temperature: 0.7, maxTokens: resolveMaxTokens(contentType ?? null) },
      );
      if (i > 0) {
        console.warn(
          `[canvas-orchestrator] recovered via fallback provider ${provider}/${model} after primary failure`,
        );
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
    try {
      await persistRegeneratedGroup(
        deliverableId,
        workspaceId,
        effectiveGroup,
        null,
        imageResults,
        0,
        { provider: 'openai', durationMs: imageDurationMs },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown persistence error';
      console.error('[canvas-orchestrator] persistRegeneratedGroup (image) failed:', message);
      yield {
        event: 'error',
        data: { message: `Failed to save regenerated images: ${message}`, recoverable: true },
      };
      return;
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

    const textModel = await resolveFeatureModel(workspaceId, 'canvas-text-generate');

    const textStart = Date.now();
    const result = await createStructuredCompletion<TextGenerationResult>(
      textModel.provider,
      textModel.model,
      systemPrompt,
      userPrompt,
      { temperature: 0.8, maxTokens: resolveMaxTokens(stack.deliverableTypeId ?? null) },
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
): { systemPrompt: string; userPrompt: string } {
  const componentTemplate = (medium?.componentTemplate ?? []) as ComponentTemplateItem[];
  const textGroups = componentTemplate
    .filter((t) => t.type !== 'image' && t.type !== 'hero-image' && t.type !== 'sound')
    .map((t) => ({
      type: t.type,
      maxLength: t.maxLength,
      required: t.required ?? false,
    }));
  const hasImageComponent = componentTemplate.some(
    (t) => t.type === 'image' || t.type === 'hero-image',
  );

  // Use type-specific prompt template if available (expert persona, methodology, anti-patterns)
  const contentType = stack.deliverableTypeId ?? '';
  const typeTemplate = getPromptTemplate(contentType);

  const systemPrompt = [
    voiceDirective || '',
    typeTemplate.systemPrompt,
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
    formatContentTypeInputs(stack.contentTypeInputs, contentType),
    medium ? formatMediumSpecs(medium) : '',
    formatMergedMediumConfig(options?.mediumConfig, stack.contentTypeInputs),
    formatVisualBrief(stack.visualBrief ?? null),
    contentType ? formatConstraintsForPrompt(contentType) : '',
    options?.additionalContextText ? `\n## Additional Context\n${options.additionalContextText}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const groupInstructions = textGroups
    .map((g) => {
      const maxLen = g.maxLength ? ` (max ${g.maxLength} characters)` : '';
      return `- "${g.type}"${maxLen}${g.required ? ' [REQUIRED]' : ''}`;
    })
    .join('\n');

  const imageInstruction = hasImageComponent
    ? buildImagePromptInstruction(stack.visualBrief ?? null)
    : '';

  const userInstruction = options?.instruction
    ? `\n\nUser instruction: ${options.instruction}`
    : '';

  const userPrompt = [
    'Generate exactly 2 variants for each of the following component groups:',
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
    '- "cta" — SHORT imperative button text. HARD LIMIT: 8 words AND 80 characters. Ideally 2-5 words.',
    '  This is BUTTON text, not a paragraph. If you cannot say it in 8 words, you are doing it wrong.',
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
    'Response schema:',
    '{',
    '  "components": [',
    '    { "group": "hook", "variants": [{ "content": "## Heading\\n\\nIntro paragraph with **bold emphasis**...\\n\\n### Sub-section\\n\\n- Bullet point one\\n- Bullet point two", "tone": "...", "cta": "Get Started Now" }, ...] }',
    '  ],',
    hasImageComponent
      ? '  "imagePrompts": [{ "description": "...", "style": "..." }]'
      : '',
    '}',
    '',
    'Each group must have exactly 2 variants with different creative approaches.',
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
    options?.additionalContextText ? `\n## Additional Context\n${options.additionalContextText}` : '',
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
    'IMPORTANT: Every variant MUST include a "cta" field — SHORT button text only. HARD LIMIT: 8 words AND 80 characters. Plain text, no markdown. Examples: "Start free trial", "Book a demo", "Download the guide". NEVER a sentence or paragraph.',
    '',
    `FORMATTING depends on the group. For "${group}" specifically:`,
    ...(["title", "meta", "meta-description", "cta", "subject", "preheader", "headline", "subheadline", "slug"].includes(group)
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
    if (includeEmoji) parts.push('- Use emoji naturally throughout the post to increase engagement.');
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
  const adFormat = config.adFormat as string | undefined;
  const urgencyLevel = config.urgencyLevel as string | undefined;
  const socialProof = config.socialProof as boolean | undefined;

  if (adFormat || urgencyLevel) {
    if (adFormat) parts.push(`- Ad format: ${adFormat}. Follow platform best practices for this format.`);
    if (config.ctaType && !ctaType) parts.push(`- CTA: ${config.ctaType as string}.`);
    if (urgencyLevel && urgencyLevel !== 'none') parts.push(`- Urgency level: ${urgencyLevel}. ${urgencyLevel === 'high' ? 'Use time-limited language and scarcity.' : 'Suggest value without pressure.'}`);
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
  'slideCount', 'slideFormat', 'includeCtaSlide',
  // Email
  'templateStyle', 'headerType', 'ctaPlacement', 'personalize', 'previewTextLength',
  // Podcast
  'episodeFormat', 'duration', 'segmentCount', 'introStyle',
  'includeShowNotes', 'includeTranscript',
  // Advertising
  'adFormat', 'urgencyLevel', 'socialProof',
  // Video
  'aspectRatio', 'footageType', 'textOverlay',
]);

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
    .filter((f) => inputs[f.key] != null && inputs[f.key] !== '')
    .map((f) => {
      const val = inputs[f.key];
      const display = Array.isArray(val) ? (val as string[]).join(', ') : String(val);
      return `- ${f.label}: ${display}`;
    });
  if (lines.length === 0) return '';
  return `\n## Content-Specific Inputs\nUse these inputs to make the content specific and actionable. For example, if SEO keywords are provided, naturally incorporate them. If a landing page URL is specified, use it in the CTA.\n${lines.join('\n')}`;
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
): Promise<void> {
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
        await tx.deliverableComponent.create({
          data: {
            deliverableId,
            componentType: component.group,
            groupType: 'variant',
            order: order++,
            variantGroup: component.group,
            variantIndex,
            isSelected: variantIndex === 0,
            generatedContent: normalizedContent,
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

    // Create image components
    const successfulImages = imageResults.filter((r): r is ImageResult => r !== null);
    for (let variantIndex = 0; variantIndex < successfulImages.length; variantIndex++) {
      const img = successfulImages[variantIndex];
      await tx.deliverableComponent.create({
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
      });
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
}

async function persistRegeneratedGroup(
  deliverableId: string,
  workspaceId: string,
  group: string,
  textGroup: TextComponentGroup | null,
  imageResults: Array<ImageResult | null> | null,
  maxIterationHint: number,
  meta?: { provider: string; durationMs?: number },
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Fetch current group components inside transaction to avoid stale data
    const groupComponents = await tx.deliverableComponent.findMany({
      where: { deliverableId, variantGroup: group },
      select: { id: true, iterationCount: true },
    });
    const maxIteration = groupComponents.reduce(
      (max, c) => Math.max(max, c.iterationCount),
      maxIterationHint,
    );

    // Delete existing components for this group
    await tx.deliverableComponent.deleteMany({
      where: { deliverableId, variantGroup: group },
    });

    // Get next order value
    const maxOrder = await tx.deliverableComponent.findFirst({
      where: { deliverableId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    let order = (maxOrder?.order ?? -1) + 1;

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
            generatedContent: normalizedContent,
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
      // Persist image variants
      const successfulImages = imageResults.filter((r): r is ImageResult => r !== null);
      for (let variantIndex = 0; variantIndex < successfulImages.length; variantIndex++) {
        const img = successfulImages[variantIndex];
        await tx.deliverableComponent.create({
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
        });
      }
    }
  });

  invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));
  invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));
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
  if (!brief || brief.source === 'none') return baseInstruction;

  const chipGuide = brief.styleDirection
    ? `\n\nIMAGE STYLE — apply this composition to BOTH imagePrompts:\n${VISUAL_STYLE_IMAGE_INSTRUCTIONS[brief.styleDirection]}`
    : '';
  const freeTextGuide = brief.styleDirectionFreeText?.trim()
    ? `\nAdditional visual direction from the user: ${brief.styleDirectionFreeText.trim()}`
    : '';
  return baseInstruction + chipGuide + freeTextGuide;
}
