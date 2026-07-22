import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { buildAiErrorResponseInit } from '@/lib/ai/error-handler';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { getStorageProvider } from '@/lib/storage';
import { resolveStorageUrls } from '@/lib/storage/resolve-storage-url';
import { z } from 'zod';
import { generateImage } from '@/lib/ai/gemini-client';
import { generateDalleImage } from '@/lib/ai/openai-client';
import { generateFalImage } from '@/lib/integrations/fal/fal-client';
import { maxAnchorsForModel } from '@/lib/ai/brand-style-anchors';
import { getFalProviderById } from '@/lib/integrations/fal/fal-providers';

// detectRecraftStyle + toFalImageSize zijn gedeeld met de headless service
// ("merken zijn taal"-batch) — één implementatie in headless-image.ts.
import { detectRecraftStyle, toFalImageSize } from '@/lib/content/headless-image';
import { buildPromptWithContext } from '@/lib/ai/prompt-context-builder';
import { resolveWorkspaceBrandContext } from '@/lib/consistent-models/workspace-context-resolver';
import { MIN_REFERENCE_IMAGES_FOR_GENERATION, REFERENCE_GENERATOR_MODEL } from '@/features/consistent-models/constants/model-constants';
import { mapGeneratedImage } from '@/features/media-library/utils/media-utils';
import { withAiRateLimit } from '@/lib/ai/middleware';
import { fetchWithSizeLimit, AI_IMAGE_SIZE_CAP } from '@/lib/security/fetch-with-limit';
import { chargeAfter } from '@/lib/billing/credits/meter-generation';
import { enforceCreditsForAction } from '@/lib/stripe/enforcement';
import type { ConsistentModelType } from '@prisma/client';

const generateSchema = z.object({
  name: z.string().min(1).max(200),
  prompt: z.string().min(1).max(1000),
  /**
   * Provider id. Accepts:
   * - 'IMAGEN' | 'DALLE' | 'TRAINED_MODEL' (built-ins)
   * - 'fal-ai/...' (any registered fal.ai provider)
   * - legacy 'FLUX_PRO' | 'RECRAFT' | 'IDEOGRAM' (back-compat only)
   */
  provider: z.string().min(1),
  // fal.ai / Imagen / Trained model aspect ratio
  aspectRatio: z.string().optional(),
  // DALL-E options
  size: z.enum(['1024x1024', '1792x1024', '1024x1792']).optional(),
  quality: z.enum(['standard', 'hd']).optional(),
  style: z.enum(['vivid', 'natural']).optional(),
  // Trained model options (single or multiple)
  trainedModelId: z.string().optional(),
  trainedModelIds: z.array(z.string()).max(3).optional(),
  // Brand context + style guidelines (applied to every provider)
  brandTags: z.array(z.string().min(1).max(100)).max(30).optional(),
  dos: z.string().max(1000).optional(),
  donts: z.string().max(1000).optional(),
  /**
   * When true, the workspace brand summary (photography guidelines, brand
   * personality direction, design language) is appended to the prompt.
   * Defaults to true. Server-side resolved — never trusts client content.
   */
  applyBrandGuidelines: z.boolean().optional(),
});

// Legacy provider aliases — map old enum values to new fal.ai ids.
const LEGACY_PROVIDER_ALIASES: Record<string, string> = {
  FLUX_PRO: 'fal-ai/flux-2-pro',
  RECRAFT: 'fal-ai/recraft-v3',
  IDEOGRAM: 'fal-ai/ideogram-v3',
};

/** POST /api/media/ai-images/generate — Generate an image via multiple providers */
export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    // Gate B (Fase 3): pre-flight 402 bij ontoereikend saldo. count=1 = conservatieve
    // per-unit-schatting (blokkeert 0-saldo op elke dure route); exacte count = follow-up.
    const creditBlock = await enforceCreditsForAction(workspaceId ?? '', 'image', 1);
    if (creditBlock) return creditBlock;
    if (!workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimit = await withAiRateLimit(workspaceId);
    if (rateLimit instanceof Response) return rateLimit;

    const body = await request.json();
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, prompt, provider: rawProvider, aspectRatio, size, quality, style, trainedModelId, trainedModelIds, brandTags, dos, donts, applyBrandGuidelines } = parsed.data;

    // Resolve provider — aliases map legacy enum values, else pass through.
    const provider = LEGACY_PROVIDER_ALIASES[rawProvider] ?? rawProvider;

    // Build the final prompt with brand context + style guidelines injected.
    // Trained model flow is excluded — it relies on LoRA weights, not prompt context.
    const isTrained = provider === 'TRAINED_MODEL';

    // Default applyBrandGuidelines to true. When enabled, fetch the workspace
    // brand summary server-side so the prompt also carries photography
    // direction, design language, and personality cues from brand foundation.
    const shouldApplyGuidelines = applyBrandGuidelines !== false;
    let brandSummary: string | undefined;
    let brandName: string | undefined;
    let logoContext: string | undefined;
    if (!isTrained && shouldApplyGuidelines) {
      const ctx = await resolveWorkspaceBrandContext(workspaceId);
      brandSummary = ctx?.contextSummary || undefined;
      brandName = ctx?.brandName || undefined;
      logoContext = ctx?.logoContext || undefined;
    }

    const finalPrompt = isTrained
      ? prompt
      : buildPromptWithContext({ prompt, brandTags, dos, donts, brandSummary, brandName, logoContext });

    let imageBytes: Buffer;
    let mimeType: string;
    let revisedPrompt: string | undefined;
    let modelName: string;
    let width: number | undefined;
    let height: number | undefined;
    let resolvedAspectRatio: string | undefined;
    let trainedModelsUsed: Array<{ id: string }> = [];

    if (provider === 'TRAINED_MODEL') {
      // ─── Stijlmodel(len) via referentiebeelden ─────────────
      // Trainer-ombouw 2026-07-21: geen LoRA meer — referentiebeelden van de
      // gekozen modellen gaan als multi-ref image_urls mee (cap 14 totaal).
      // Support both single trainedModelId and multi trainedModelIds
      const modelIds = trainedModelIds?.length ? trainedModelIds : trainedModelId ? [trainedModelId] : [];
      if (modelIds.length === 0) {
        return NextResponse.json({ error: 'At least one style model ID is required' }, { status: 400 });
      }

      const trainedModels = await prisma.consistentModel.findMany({
        where: { id: { in: modelIds }, workspaceId },
        include: {
          referenceImages: {
            where: { isTrainingImage: true },
            orderBy: { sortOrder: 'asc' },
            select: { storageUrl: true },
          },
        },
      });

      const readyModels = trainedModels.filter(
        (m) => m.referenceImages.length >= MIN_REFERENCE_IMAGES_FOR_GENERATION,
      );
      if (readyModels.length === 0) {
        return NextResponse.json(
          { error: `No usable style models found — each needs at least ${MIN_REFERENCE_IMAGES_FOR_GENERATION} reference images.` },
          { status: 404 },
        );
      }
      trainedModelsUsed = readyModels.map((m) => ({ id: m.id }));

      // Refs eerlijk verdelen over de modellen binnen de generator-cap.
      const refCap = maxAnchorsForModel(REFERENCE_GENERATOR_MODEL);
      const perModel = Math.max(1, Math.floor(refCap / readyModels.length));
      // Resolve naar een nú-bereikbare URL: opgeslagen signed R2-URLs verlopen
      // na 1 uur — fal kan ze dan niet downloaden en genereert stil zonder stijl.
      const referenceImageUrls = await resolveStorageUrls(
        readyModels
          .flatMap((m) => m.referenceImages.slice(0, perModel).map((img) => img.storageUrl))
          .slice(0, refCap),
      );

      const stylePrompts = readyModels
        .map((m) => m.stylePrompt)
        .filter((sp): sp is string => !!sp && sp.trim().length > 0);
      const combinedNegativePrompt = readyModels
        .map((m) => m.negativePrompt)
        .filter((np): np is string => !!np && np.trim().length > 0)
        .join(', ');

      const styledPrompt = stylePrompts.length > 0 ? `${prompt}, ${stylePrompts.join(', ')}` : prompt;

      const result = await generateFalImage(REFERENCE_GENERATOR_MODEL, styledPrompt, {
        negativePrompt: combinedNegativePrompt || undefined,
        numImages: 1,
        imageSize: aspectRatio === '16:9' ? 'landscape_16_9'
          : aspectRatio === '9:16' ? 'portrait_16_9'
          : aspectRatio === '3:4' ? 'portrait_4_3'
          : aspectRatio === '4:3' ? 'landscape_4_3'
          : 'square_hd',
        referenceImageUrls,
        resolution: '4K',
      });

      if (!result.images?.[0]?.url) {
        return NextResponse.json({ error: 'No image generated' }, { status: 500 });
      }

      try {
        imageBytes = await fetchWithSizeLimit(result.images[0].url, AI_IMAGE_SIZE_CAP);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to download generated image';
        return NextResponse.json({ error: msg }, { status: 500 });
      }
      mimeType = 'image/png';
      const modelNames = readyModels.map((m) => m.name).join(' + ');
      modelName = `${REFERENCE_GENERATOR_MODEL} (stijlreferenties: ${modelNames})`;
      resolvedAspectRatio = aspectRatio ?? '1:1';

    } else if (provider.startsWith('fal-ai/')) {
      // ─── fal.ai models (generic routing by provider id) ──
      if (!process.env.FAL_KEY) {
        return NextResponse.json(
          { error: 'FAL_KEY is not configured. Add FAL_KEY to enable fal.ai image generation.' },
          { status: 400 }
        );
      }

      const falProvider = getFalProviderById(provider);
      if (!falProvider) {
        return NextResponse.json(
          { error: `Unknown fal.ai provider: ${provider}` },
          { status: 400 }
        );
      }

      // Geef het provider-ID door (niet het endpoint): generateFalImage
      // resolvet het geneste endpoint zelf via de registry (F42) én heeft het
      // ID nodig voor model-specifieke logica. Door hier voorheen het
      // endpoint door te geven sloeg die logica nooit aan — waaronder het
      // Recraft-stijlveld, waardoor "illustratie"-prompts als foto uitkwamen
      // (Recraft default = photoreal zonder structured style, F42d).
      const result = await generateFalImage(falProvider.id, finalPrompt, {
        imageSize: toFalImageSize(aspectRatio ?? '1:1'),
        numImages: 1,
        // Stijl-intentie uit de gebruikersprompt (niet finalPrompt — de
        // brand-context kan fotografie-richtlijnen bevatten).
        recraftStyle: detectRecraftStyle(prompt),
      });

      if (!result.images?.[0]?.url) {
        return NextResponse.json({ error: 'No image generated' }, { status: 500 });
      }

      try {
        imageBytes = await fetchWithSizeLimit(result.images[0].url, AI_IMAGE_SIZE_CAP);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to download generated image';
        return NextResponse.json({ error: msg }, { status: 500 });
      }
      mimeType = 'image/png';
      modelName = falProvider.id;
      width = result.images[0].width;
      height = result.images[0].height;
      resolvedAspectRatio = aspectRatio ?? '1:1';

    } else if (provider === 'IMAGEN') {
      // ─── Google Imagen 4 ──────────────────────────────────
      if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json(
          { error: 'Google Gemini API key is not configured. Add GEMINI_API_KEY to enable Imagen image generation.' },
          { status: 400 }
        );
      }

      const result = await generateImage(finalPrompt, {
        aspectRatio: aspectRatio ?? '1:1',
      });
      imageBytes = result.imageBytes;
      mimeType = result.mimeType;
      modelName = 'imagen-4.0-generate-001';
      resolvedAspectRatio = aspectRatio ?? '1:1';

    } else if (provider === 'DALLE') {
      // ─── DALL-E 3 ─────────────────────────────────────────
      if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json(
          { error: 'OpenAI API key is not configured. Add OPENAI_API_KEY to enable DALL-E image generation.' },
          { status: 400 }
        );
      }

      const dalleSize = size ?? '1024x1024';
      const result = await generateDalleImage(finalPrompt, {
        size: dalleSize,
        quality: quality ?? 'standard',
        style: style ?? 'vivid',
      });
      imageBytes = result.imageBytes;
      mimeType = result.mimeType;
      revisedPrompt = result.revisedPrompt;
      modelName = 'dall-e-3';

      const [w, h] = dalleSize.split('x').map(Number);
      width = w;
      height = h;
      if (dalleSize === '1024x1024') resolvedAspectRatio = '1:1';
      else if (dalleSize === '1792x1024') resolvedAspectRatio = '16:9';
      else if (dalleSize === '1024x1792') resolvedAspectRatio = '9:16';

    } else {
      return NextResponse.json(
        { error: `Unknown provider: ${rawProvider}` },
        { status: 400 }
      );
    }

    // Upload to storage
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
    const fileName = `${slug || 'ai-image'}-${Date.now()}.${ext}`;
    const storageProvider = getStorageProvider();
    const uploadResult = await storageProvider.upload(imageBytes, {
      workspaceId,
      fileName,
      contentType: mimeType,
    });

    // Create DB record — clean up storage file if DB write fails
    let image;
    try {
      image = await prisma.generatedImage.create({
        data: {
          name,
          prompt,
          revisedPrompt: revisedPrompt ?? null,
          provider,
          model: modelName,
          fileUrl: uploadResult.url,
          fileName,
          fileSize: uploadResult.fileSize,
          fileType: mimeType,
          width: width ?? null,
          height: height ?? null,
          aspectRatio: resolvedAspectRatio ?? null,
          style: style ?? null,
          quality: quality ?? null,
          workspaceId,
          createdById: session.user.id,
        },
      });
    } catch (dbError) {
      try { await storageProvider.delete(uploadResult.url); } catch { /* best-effort cleanup */ }
      throw dbError;
    }

    invalidateCache(cacheKeys.media.aiImages(workspaceId));
    invalidateCache(cacheKeys.prefixes.media(workspaceId));

    // Trained-model-generaties óók als ConsistentModelGeneration registreren —
    // anders blijft de model-detailpagina (hero/galerij/Generaties-teller) leeg
    // terwijl AI Studio het beeld wél toont (twee-ketens-klasse, gotcha
    // 2026-06-24). Fail-soft: het beeld is al gemaakt en opgeslagen, dus deze
    // secundaire boekhouding mag de request niet laten falen.
    if (trainedModelsUsed.length > 0) {
      try {
        await prisma.$transaction([
          prisma.consistentModelGeneration.createMany({
            data: trainedModelsUsed.map((m) => ({
              consistentModelId: m.id,
              workspaceId,
              createdById: session.user.id,
              prompt,
              width: width ?? 1024,
              height: height ?? 1024,
              storageKey: uploadResult.url,
              storageUrl: uploadResult.url,
              aiProvider: 'fal',
              aiModel: REFERENCE_GENERATOR_MODEL,
            })),
          }),
          prisma.consistentModel.updateMany({
            where: { id: { in: trainedModelsUsed.map((m) => m.id) } },
            data: { usageCount: { increment: 1 } },
          }),
        ]);
        invalidateCache(cacheKeys.prefixes.consistentModels(workspaceId));
      } catch (genErr) {
        console.warn(
          '[ai-images/generate] ConsistentModelGeneration-registratie faalde (non-blocking):',
          genErr instanceof Error ? genErr.message : genErr,
        );
      }
    }

    // Credit-afboeking (Fase 2): 1 beeld = image-credits (count-gebaseerd), post-hoc.
    // Trained-style = 'image-4k' (4K + multi-ref, duurdere COGS); rest = 'image'.
    await chargeAfter(
      { workspaceId, action: trainedModelsUsed.length > 0 ? 'image-4k' : 'image', feature: 'ai-image' },
      { count: 1 },
    ).catch(() => {});

    return NextResponse.json(
      mapGeneratedImage(image as unknown as Record<string, unknown>),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error generating image:', error);
    const { body, status } = buildAiErrorResponseInit(error);
    return NextResponse.json(body, { status });
  }
}
