// =============================================================================
// POST /api/studio/[deliverableId]/generate-visual-trained
//
// Phase 5 of the Visual Brief — generates image variants from one of the
// workspace's trained ConsistentModels (LoRA fine-tunes). Selected via
// settings.visualBrief.trained.modelId; strength maps to LoRA scale.
//
// Flow mirrors generate-visual: build prompts via buildVisualBriefImagePrompts,
// resolve aspect ratio from MediumEnrichment, swap the model swap-out for a
// runFalGeneration call against model.generatorEndpoint with a LoRA array.
// =============================================================================
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { buildAiErrorResponseInit } from '@/lib/ai/error-handler';
import { getServerSession } from '@/lib/auth-server';
import { resolveDeliverableWorkspaceId } from '@/lib/deliverable/deliverable-access';
import { prisma } from '@/lib/prisma';
import { withAiRateLimit } from '@/lib/ai/middleware';
import { assembleCanvasContext, type CanvasContextStack } from '@/lib/ai/canvas-context';
import { buildVisualBriefImagePrompts } from '@/lib/ai/visual-brief-prompts';
import { getMultiCandidateDefault } from '@/features/campaigns/lib/deliverable-types';
import { foldNegativeIntoPrompt, runFalGeneration } from '@/lib/integrations/fal/fal-client';
import { fetchWithSizeLimit, AI_IMAGE_SIZE_CAP } from '@/lib/security/fetch-with-limit';
import { getStorageProvider } from '@/lib/storage';
import { invalidateCache } from '@/lib/api/cache';
import { scoreImageFidelity } from '@/lib/brand-fidelity/visual-fidelity-scorer';
import { cacheKeys } from '@/lib/api/cache-keys';
import { chargeAfter } from '@/lib/billing/credits/meter-generation';
import { ingestUploadsToLibrary } from '@/lib/media/ingest-uploads-to-library';
import { patchHeroVisualUrl } from '@/lib/deliverable/patch-hero-visual';
import { LORA_QUALITY_CONFIG } from '@/features/consistent-models/constants/model-constants';
import type { ConsistentModelType } from '@/features/consistent-models/types/consistent-model.types';

const VISUAL_GROUP = 'visual';
const DEFAULT_GENERATOR = 'fal-ai/flux-lora';

/**
 * Aspect-ratio resolution mirrors generate-visual — duplicated locally so
 * each visual-source endpoint is self-contained. fal-ai/flux-lora accepts
 * image_size as either a preset string or {width,height} object; we use
 * presets so the existing FalImageSize union covers it.
 */
type FalImageSize =
  | 'square_hd'
  | 'landscape_16_9'
  | 'portrait_16_9'
  | 'landscape_4_3'
  | 'portrait_4_3';

function widthHeightToFalSize(width: number, height: number): FalImageSize {
  if (!width || !height) return 'square_hd';
  const ratio = width / height;
  const candidates: Array<{ size: FalImageSize; ratio: number }> = [
    { size: 'square_hd', ratio: 1 },
    { size: 'landscape_16_9', ratio: 16 / 9 },
    { size: 'portrait_16_9', ratio: 9 / 16 },
    { size: 'landscape_4_3', ratio: 4 / 3 },
    { size: 'portrait_4_3', ratio: 3 / 4 },
  ];
  let best = candidates[0];
  let bestDelta = Math.abs(Math.log(ratio / best.ratio));
  for (const c of candidates.slice(1)) {
    const delta = Math.abs(Math.log(ratio / c.ratio));
    if (delta < bestDelta) {
      bestDelta = delta;
      best = c;
    }
  }
  return best.size;
}

function falSizeToAspectLabel(size: FalImageSize): string {
  return {
    square_hd: '1:1',
    landscape_16_9: '16:9',
    portrait_16_9: '9:16',
    landscape_4_3: '4:3',
    portrait_4_3: '3:4',
  }[size];
}

function resolveAspectFromMedium(stack: CanvasContextStack): FalImageSize | null {
  const specs = stack.medium?.specs as Record<string, unknown> | undefined;
  if (!specs) return null;
  const candidates = [specs.imageSize, specs.heroImageSize, specs.videoSize];
  for (const raw of candidates) {
    if (raw && typeof raw === 'object') {
      const obj = raw as { width?: unknown; height?: unknown };
      if (typeof obj.width === 'number' && typeof obj.height === 'number') {
        return widthHeightToFalSize(obj.width, obj.height);
      }
    }
  }
  return null;
}

const FAL_SIZE_FOR_LABEL = {
  '1:1': 'square_hd',
  '16:9': 'landscape_16_9',
  '9:16': 'portrait_16_9',
  '4:3': 'landscape_4_3',
  '3:4': 'portrait_4_3',
} as const satisfies Record<string, FalImageSize>;

/** Convert FalImageSize preset to the explicit {width,height} object that
 * the flux-lora endpoint expects. */
function falSizeToDims(size: FalImageSize): { width: number; height: number } {
  switch (size) {
    case 'square_hd':       return { width: 1024, height: 1024 };
    case 'landscape_16_9':  return { width: 1344, height: 768 };
    case 'portrait_16_9':   return { width: 768, height: 1344 };
    case 'landscape_4_3':   return { width: 1152, height: 896 };
    case 'portrait_4_3':    return { width: 896, height: 1152 };
  }
}

const requestSchema = z
  .object({
    instruction: z.string().max(1000).optional(),
    aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4']).optional(),
    count: z.number().int().min(1).max(3).optional(),
    // 'hero' in de LP-flow → wire het getrainde beeld server-side in
    // puckData.BrandHero + structuredVariant.hero (orphaned-hero-preventie).
    target: z.enum(['hero']).optional(),
  })
  .strict()
  .or(z.undefined());

interface RouteParams {
  params: Promise<{ deliverableId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    // Resource-based: workspace van het deliverable i.p.v. cookie-gelijkheid
    // (zombie-tab fix — docs/audits/2026-06-10-workspace-cookie-zombie-tabs.md).
    const workspaceId = await resolveDeliverableWorkspaceId((await params).deliverableId);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimit = await withAiRateLimit(workspaceId);
    if (rateLimit instanceof Response) return rateLimit;

    const { deliverableId } = await params;

    const deliverable = await prisma.deliverable.findFirst({
      where: { id: deliverableId, campaign: { workspaceId } },
      select: { id: true, settings: true, contentType: true },
    });
    if (!deliverable) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    let body: z.infer<typeof requestSchema>;
    try {
      const raw = await request.text();
      body = raw ? requestSchema.parse(JSON.parse(raw)) : undefined;
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const settings = (deliverable.settings ?? {}) as Record<string, unknown>;
    const visualBrief = settings.visualBrief as Record<string, unknown> | null;
    const source = visualBrief?.source ?? null;
    if (source !== 'trained-style') {
      return NextResponse.json(
        { error: `Visual Brief source is "${source}" — switch to "trained-style" on Step 1 first.` },
        { status: 400 },
      );
    }

    const trainedConfig = visualBrief?.trained as { modelId?: string; strength?: number } | undefined;
    const modelId = trainedConfig?.modelId;
    if (!modelId) {
      return NextResponse.json(
        { error: 'No trained model selected. Pick one in Step 2 before generating.' },
        { status: 400 },
      );
    }

    const trainedModel = await prisma.consistentModel.findFirst({
      where: { id: modelId, workspaceId, status: 'READY' },
    });
    if (!trainedModel) {
      return NextResponse.json(
        { error: 'Selected trained model is not available. It may be archived, training, or belong to another workspace.' },
        { status: 404 },
      );
    }
    if (!trainedModel.falLoraUrl) {
      return NextResponse.json(
        { error: 'Trained model has no LoRA weights — training may be incomplete.' },
        { status: 400 },
      );
    }

    const stack = await assembleCanvasContext(deliverableId, workspaceId);
    if (!stack.visualBrief) {
      stack.visualBrief = {
        source: 'trained-style',
        styleDirection: null,
        styleDirectionFreeText: null,
        trained: { modelId, strength: trainedConfig?.strength },
      };
    }

    const promptCount = body?.count
      ?? getMultiCandidateDefault(stack.deliverableTypeId ?? '');
    const { prompts: basePrompts, negativePrompt } = buildVisualBriefImagePrompts(
      stack.visualBrief,
      stack.brand,
      {
        keyMessage: stack.brief?.keyMessage ?? null,
        objective: stack.brief?.objective ?? null,
        callToAction: stack.brief?.callToAction ?? null,
        personas: stack.personas,
        products: stack.products,
        creativePlatform: stack.concept?.creativePlatform ?? null,
        platform: stack.medium?.platform ?? null,
        deliverableTypeId: stack.deliverableTypeId ?? null,
      },
      promptCount,
    );

    // Inject trigger word + LoRA-type-specific prefix so the model fires
    // its trained subject (mirrors the multi-LoRA pattern in
    // /api/media/ai-images/generate).
    const config = LORA_QUALITY_CONFIG[trainedModel.type as ConsistentModelType];
    const triggerWord = trainedModel.triggerWord ?? 'TOK';
    const triggerPrefix = `${config.triggerPrefix} ${triggerWord}, `;
    const prompts = basePrompts.map((p) =>
      p.includes(triggerWord) ? p : triggerPrefix + p,
    );

    // Pattern A image-quality-chain: combine the LoRA-config negative prompt
    // with the workspace negative prompt (defaults + imageryDonts).
    const combinedNegativePrompt = [config.negativePrompt, negativePrompt]
      .filter((s): s is string => !!s && s.trim().length > 0)
      .join(', ');

    const generatorEndpoint = trainedModel.generatorEndpoint ?? DEFAULT_GENERATOR;

    const instructedPrompts = body?.instruction
      ? prompts.map((p) => `${p} ${body!.instruction}`)
      : prompts;
    // The LoRA generators (fal-ai/flux-2/lora, fal-ai/flux-lora) have no
    // negative_prompt input field and fal drops unknown fields silently, so
    // sending the negatives as a native param was a dead no-op (prompt-audit
    // 2026-06-11). Fold them into the positive prompt as a capped directive.
    const finalPrompts = instructedPrompts.map((p) =>
      foldNegativeIntoPrompt(generatorEndpoint, p, combinedNegativePrompt),
    );

    const explicitFalSize = body?.aspectRatio ? FAL_SIZE_FOR_LABEL[body.aspectRatio] : null;
    const falImageSize: FalImageSize =
      explicitFalSize ?? resolveAspectFromMedium(stack) ?? 'square_hd';
    const aspectLabel = falSizeToAspectLabel(falImageSize);

    // Strength slider 0-100 → LoRA scale relative to the type's default.
    // 100 = config default, 50 = half. Clamps so the model still fires.
    const rawStrength = trainedConfig?.strength;
    const strengthFactor =
      typeof rawStrength === 'number' && Number.isFinite(rawStrength)
        ? Math.max(0.1, Math.min(2.0, rawStrength / 100))
        : 1.0;
    const loraScale = config.loraScale * strengthFactor;

    const startMs = Date.now();
    const generated = await Promise.all(
      finalPrompts.map(async (prompt) => {
        try {
          const result = await runFalGeneration(generatorEndpoint, {
            prompt,
            loras: [{ path: trainedModel.falLoraUrl!, scale: loraScale }],
            num_images: 1,
            num_inference_steps: config.inferenceSteps || 40,
            guidance_scale: config.guidanceScale || 4.5,
            output_format: 'png',
            image_size: falSizeToDims(falImageSize),
            // No negative_prompt here: the endpoint has no such input — the
            // negatives are folded into the prompt above.
          });
          const url = result.images?.[0]?.url;
          if (!url) return null;
          return { prompt, hostedUrl: url };
        } catch (err) {
          console.error(
            `[generate-visual-trained] ${generatorEndpoint} call failed:`,
            err instanceof Error ? err.message : err,
          );
          return null;
        }
      }),
    );

    const successful = generated.filter((r): r is NonNullable<typeof r> => r !== null);
    if (successful.length === 0) {
      return NextResponse.json(
        { error: `All trained-model generation calls failed (model: ${trainedModel.name}). Check that FAL_KEY is configured.` },
        { status: 502 },
      );
    }

    // Credit-afboeking (Fase 2): count = werkelijk gegenereerde beelden (successful).
    await chargeAfter({ workspaceId, action: 'image', feature: 'studio-visual-trained' }, { count: successful.length }).catch(() => {});

    const storage = getStorageProvider();
    const uploads = await Promise.all(
      successful.map(async (img, idx) => {
        const bytes = await fetchWithSizeLimit(img.hostedUrl, AI_IMAGE_SIZE_CAP);
        const fileName = `canvas-visual-trained-${deliverableId}-${Date.now()}-${idx}.png`;
        const upload = await storage.upload(bytes, {
          workspaceId,
          fileName,
          contentType: 'image/png',
        });
        return { url: upload.url, prompt: img.prompt, fileSize: bytes.length };
      }),
    );

    // LP-hero-wiring (gedeelde helper, gelijk aan generate-visual): bust het
    // eerste getrainde beeld in puckData.BrandHero zodat de pagina ermee rendert.
    if (body?.target === 'hero' && uploads[0]?.url) {
      await patchHeroVisualUrl(deliverableId, uploads[0].url);
    }

    const elapsedMs = Date.now() - startMs;
    const aiModel = `${generatorEndpoint} (LoRA: ${trainedModel.name})`;

    const components = await prisma.$transaction(async (tx) => {
      await tx.deliverableComponent.deleteMany({
        where: { deliverableId, variantGroup: VISUAL_GROUP },
      });
      const baseOrder = await tx.deliverableComponent.count({ where: { deliverableId } });
      const created: Array<{ id: string; url: string; prompt: string }> = [];
      for (let i = 0; i < uploads.length; i++) {
        const u = uploads[i];
        const row = await tx.deliverableComponent.create({
          data: {
            deliverableId,
            componentType: 'image',
            groupType: 'variant',
            order: baseOrder + i,
            variantGroup: VISUAL_GROUP,
            variantIndex: i,
            isSelected: i === 0,
            imageUrl: u.url,
            imageSource: 'ai_generated',
            imagePromptUsed: u.prompt,
            aiProvider: 'fal',
            aiModel,
            generationDuration: elapsedMs,
            status: 'GENERATED',
            generatedAt: new Date(),
            iterationCount: 0,
          },
          select: { id: true, imageUrl: true, imagePromptUsed: true },
        });
        created.push({ id: row.id, url: row.imageUrl ?? '', prompt: row.imagePromptUsed ?? '' });
      }
      return created;
    });

    invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));

    // Library-groei (#325-patroon): elk getraind AI-beeld als MediaAsset voor
    // hergebruik via library-first matching. Fire-and-forget.
    ingestUploadsToLibrary(uploads, {
      workspaceId,
      uploadedById: session.user.id,
      deliverableTypeId: stack.deliverableTypeId,
      defaultContentType: 'image/png',
    });

    // G8 — fire-and-forget visual fidelity scoring for the new components.
    // Each call costs ~$0.04 (Claude vision). The route returns immediately
    // with variants; the client's components query refetches after a delay
    // to pick up the scores once they land.
    void Promise.allSettled(
      components.map((c) =>
        scoreImageFidelity({ componentId: c.id, workspaceId }),
      ),
    ).catch(() => {
      /* individual failures are logged inside scoreImageFidelity */
    });

    return NextResponse.json({
      variants: components,
      provider: 'fal',
      model: aiModel,
      source: 'trained-style',
      modelId: trainedModel.id,
      modelName: trainedModel.name,
      aspectRatio: aspectLabel,
      generationDuration: elapsedMs,
    });
  } catch (err) {
    console.error('[generate-visual-trained] error:', err);
    const { body, status } = buildAiErrorResponseInit(err);
    return NextResponse.json(body, { status });
  }
}
