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
import { assembleCanvasContext, type CanvasContextStack, type MediumContext, type PersonaContext, type BriefContext, type ProductContext } from './canvas-context';
import { createStructuredCompletion } from './exploration/ai-caller';
import { resolveFeatureModel, assertProvider } from './feature-models.server';
import { calculateOptimalPublishDate, type PublishSuggestion } from '@/lib/campaigns/publish-scheduler';
import { formatBrandContext, type BrandContextBlock } from './prompt-templates';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import type { JourneyPhaseContext } from '@/lib/campaigns/journey-phase';
import { getDeliverableTypeById } from '@/features/campaigns/lib/deliverable-types';
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
}

interface TextComponentGroup {
  group: string;
  variants: Array<{
    content: string;
    tone?: string;
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

  // ── Regeneration path ─────────────────────────────────
  if (options?.regenerateGroup) {
    yield* handleRegeneration(deliverableId, workspaceId, stack, options, startTime);
    return;
  }

  // ── Step 2: Generate text components ──────────────────
  const { systemPrompt, userPrompt } = buildCanvasPrompt(stack, stack.medium, options);
  const textModel = await resolveFeatureModel(workspaceId, 'canvas-text-generate');

  for (const group of textGroups) {
    yield { event: 'text_generating', data: { group, status: 'generating' } };
  }

  const textResult = await createStructuredCompletion<TextGenerationResult>(
    textModel.provider,
    textModel.model,
    systemPrompt,
    userPrompt,
    { temperature: 0.7, maxTokens: 8000 },
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
        })),
      },
    };
  }

  // ── Step 3: Generate images ───────────────────────────
  let imageResults: Array<ImageResult | null> = [];
  let imageDurationMs = 0;

  if (hasImageComponent && textResult.imagePrompts?.length) {
    yield {
      event: 'image_prompt_ready',
      data: {
        prompts: textResult.imagePrompts.map((p) => p.description),
      },
    };

    yield {
      event: 'image_generating',
      data: { status: 'generating', count: textResult.imagePrompts.length },
    };

    const imageGenStart = Date.now();
    imageResults = await generateImages(
      textResult.imagePrompts.map((p) => p.description),
      stack.brand,
      workspaceId,
    );
    imageDurationMs = Date.now() - imageGenStart;

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
        data: { message: 'All image generations failed', recoverable: true },
      };
    }
  }

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

// ─── Regeneration Handler ─────────────────────────────────

async function* handleRegeneration(
  deliverableId: string,
  workspaceId: string,
  stack: CanvasContextStack,
  options: OrchestrationOptions,
  startTime: number,
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
    );

    const textModel = await resolveFeatureModel(workspaceId, 'canvas-text-generate');

    const textStart = Date.now();
    const result = await createStructuredCompletion<TextGenerationResult>(
      textModel.provider,
      textModel.model,
      systemPrompt,
      userPrompt,
      { temperature: 0.8, maxTokens: 4000 },
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

  const systemPrompt = [
    'You are an expert content strategist and copywriter for brand marketing.',
    'Generate content components based on the provided brand context, campaign strategy, and platform specifications.',
    '',
    'IMPORTANT: Respond with valid JSON only. No markdown, no explanation, no code blocks — just the raw JSON object.',
    '',
    '## Brand Context',
    formatBrandContext(stack.brand),
    '',
    formatPersonaContext(stack.personas),
    stack.concept ? formatConceptContext(stack.concept) : '',
    stack.journeyPhase ? formatPhaseGuidance(stack.journeyPhase) : '',
    stack.brief ? formatBriefContext(stack.brief) : '',
    stack.products.length > 0 ? formatProductContext(stack.products) : '',
    medium ? formatMediumSpecs(medium) : '',
    options?.mediumConfig ? formatMediumConfig(options.mediumConfig) : '',
    stack.deliverableTypeId ? formatConstraintsForPrompt(stack.deliverableTypeId) : '',
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
    ? '\n\nAlso generate 2 "imagePrompts" — detailed image generation prompts that match the brand visual identity. Each prompt should describe the image in detail including style, composition, and mood.'
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
    'Response schema:',
    '{',
    '  "components": [',
    '    { "group": "hook", "variants": [{ "content": "...", "tone": "..." }, ...] }',
    '  ],',
    hasImageComponent
      ? '  "imagePrompts": [{ "description": "...", "style": "..." }]'
      : '',
    '}',
    '',
    'Each group must have exactly 2 variants with different creative approaches.',
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
): { systemPrompt: string; userPrompt: string } {
  const groupComponents = existingComponents.filter((c) => c.variantGroup === group);

  const systemPrompt = [
    'You are an expert content strategist and copywriter for brand marketing.',
    'You are regenerating a specific content component group based on user feedback.',
    '',
    'IMPORTANT: Respond with valid JSON only. No markdown, no explanation, no code blocks — just the raw JSON object.',
    '',
    '## Brand Context',
    formatBrandContext(stack.brand),
    '',
    formatPersonaContext(stack.personas),
    stack.concept ? formatConceptContext(stack.concept) : '',
    stack.journeyPhase ? formatPhaseGuidance(stack.journeyPhase) : '',
    stack.brief ? formatBriefContext(stack.brief) : '',
    stack.products.length > 0 ? formatProductContext(stack.products) : '',
    options?.mediumConfig ? formatMediumConfig(options.mediumConfig) : '',
    stack.deliverableTypeId ? formatConstraintsForPrompt(stack.deliverableTypeId) : '',
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
    '',
    'Response schema:',
    '{',
    '  "components": [',
    `    { "group": "${group}", "variants": [{ "content": "...", "tone": "..." }, { "content": "...", "tone": "..." }] }`,
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
  for (const [key, value] of entries) {
    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
    const display = typeof value === 'object' ? JSON.stringify(value) : String(value);
    parts.push(`- ${label}: ${display}`);
  }
  parts.push('');
  parts.push('IMPORTANT: Adapt your content to match these medium configuration settings.');
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
    brandContext.brandDesignLanguage ? `Design language: ${brandContext.brandDesignLanguage}.` : '',
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
        await tx.deliverableComponent.create({
          data: {
            deliverableId,
            componentType: component.group,
            groupType: 'variant',
            order: order++,
            variantGroup: component.group,
            variantIndex,
            isSelected: variantIndex === 0,
            generatedContent: variant.content,
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
      // Persist text variants
      for (let variantIndex = 0; variantIndex < textGroup.variants.length; variantIndex++) {
        const variant = textGroup.variants[variantIndex];
        await tx.deliverableComponent.create({
          data: {
            deliverableId,
            componentType: group,
            groupType: 'variant',
            order: order++,
            variantGroup: group,
            variantIndex,
            isSelected: variantIndex === 0,
            generatedContent: variant.content,
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
