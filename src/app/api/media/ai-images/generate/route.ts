import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { getStorageProvider } from '@/lib/storage';
import { z } from 'zod';
import { generateImage } from '@/lib/ai/gemini-client';
import { generateDalleImage } from '@/lib/ai/openai-client';
import { runFalGeneration, generateFalImage } from '@/lib/integrations/fal/fal-client';
import { getFalProviderById, getFalEndpoint } from '@/lib/integrations/fal/fal-providers';
import { buildPromptWithContext } from '@/lib/ai/prompt-context-builder';
import { resolveWorkspaceBrandContext } from '@/lib/consistent-models/workspace-context-resolver';
import { LORA_QUALITY_CONFIG } from '@/features/consistent-models/constants/model-constants';
import { mapGeneratedImage } from '@/features/media-library/utils/media-utils';
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

// Map aspect ratio string to fal.ai image_size preset
function toFalImageSize(ar: string): string {
  const map: Record<string, string> = {
    '1:1': 'square_hd',
    '16:9': 'landscape_16_9',
    '9:16': 'portrait_16_9',
    '3:4': 'portrait_4_3',
    '4:3': 'landscape_4_3',
  };
  return map[ar] ?? 'square_hd';
}

/** POST /api/media/ai-images/generate — Generate an image via multiple providers */
export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    if (!isTrained && shouldApplyGuidelines) {
      const ctx = await resolveWorkspaceBrandContext(workspaceId);
      brandSummary = ctx?.contextSummary || undefined;
    }

    const finalPrompt = isTrained
      ? prompt
      : buildPromptWithContext({ prompt, brandTags, dos, donts, brandSummary });

    let imageBytes: Buffer;
    let mimeType: string;
    let revisedPrompt: string | undefined;
    let modelName: string;
    let width: number | undefined;
    let height: number | undefined;
    let resolvedAspectRatio: string | undefined;

    if (provider === 'TRAINED_MODEL') {
      // ─── Trained LoRA model(s) via fal.ai ─────────────────
      // Support both single trainedModelId and multi trainedModelIds
      const modelIds = trainedModelIds?.length ? trainedModelIds : trainedModelId ? [trainedModelId] : [];
      if (modelIds.length === 0) {
        return NextResponse.json({ error: 'At least one trained model ID is required' }, { status: 400 });
      }

      const trainedModels = await prisma.consistentModel.findMany({
        where: { id: { in: modelIds }, workspaceId, status: 'READY' },
      });

      const readyModels = trainedModels.filter((m) => m.falLoraUrl);
      if (readyModels.length === 0) {
        return NextResponse.json({ error: 'No ready trained models found' }, { status: 404 });
      }

      // Build LoRA array + combined prompt with all trigger words
      const loras: Array<{ path: string; scale: number }> = [];
      const triggerWords: string[] = [];
      let combinedNegativePrompt = '';
      let maxInferenceSteps = 0;
      let avgGuidanceScale = 0;

      for (const model of readyModels) {
        const config = LORA_QUALITY_CONFIG[model.type as ConsistentModelType];
        // Scale down each LoRA when combining multiple (prevent oversaturation)
        const scaleMultiplier = readyModels.length > 1 ? 0.8 : 1.0;
        loras.push({ path: model.falLoraUrl!, scale: config.loraScale * scaleMultiplier });

        const tw = model.triggerWord ?? 'TOK';
        if (!prompt.includes(tw)) triggerWords.push(`${config.triggerPrefix} ${tw}`);

        if (config.negativePrompt) {
          combinedNegativePrompt += (combinedNegativePrompt ? ', ' : '') + config.negativePrompt;
        }
        maxInferenceSteps = Math.max(maxInferenceSteps, config.inferenceSteps);
        avgGuidanceScale += config.guidanceScale;
      }
      avgGuidanceScale /= readyModels.length;

      const triggerPrefix = triggerWords.length > 0 ? triggerWords.join(', ') + ', ' : '';
      const loraPrompt = triggerPrefix + prompt;

      // Use first model's endpoint (all should be compatible Flux-based)
      const generatorEndpoint = readyModels[0].generatorEndpoint ?? 'fal-ai/flux-lora';

      const result = await runFalGeneration(generatorEndpoint, {
        prompt: loraPrompt,
        loras,
        num_images: 1,
        num_inference_steps: maxInferenceSteps || 40,
        guidance_scale: avgGuidanceScale || 4.5,
        output_format: 'png',
        image_size: aspectRatio === '16:9' ? { width: 1344, height: 768 }
          : aspectRatio === '9:16' ? { width: 768, height: 1344 }
          : aspectRatio === '3:4' ? { width: 896, height: 1152 }
          : aspectRatio === '4:3' ? { width: 1152, height: 896 }
          : { width: 1024, height: 1024 },
        ...(combinedNegativePrompt ? { negative_prompt: combinedNegativePrompt } : {}),
      });

      if (!result.images?.[0]?.url) {
        return NextResponse.json({ error: 'No image generated' }, { status: 500 });
      }

      const imgResponse = await fetch(result.images[0].url);
      if (!imgResponse.ok) {
        return NextResponse.json({ error: 'Failed to download generated image' }, { status: 500 });
      }
      imageBytes = Buffer.from(await imgResponse.arrayBuffer());
      mimeType = 'image/png';
      const modelNames = readyModels.map((m) => m.name).join(' + ');
      modelName = `${generatorEndpoint} (LoRA: ${modelNames})`;
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

      // Resolve the actual fal.ai endpoint — some providers route through a
      // nested path (e.g. fal-ai/recraft/v3/text-to-image) while keeping a
      // shorter stable id (fal-ai/recraft-v3) in our DB.
      const result = await generateFalImage(getFalEndpoint(falProvider), finalPrompt, {
        imageSize: toFalImageSize(aspectRatio ?? '1:1'),
        numImages: 1,
      });

      if (!result.images?.[0]?.url) {
        return NextResponse.json({ error: 'No image generated' }, { status: 500 });
      }

      const imgResponse = await fetch(result.images[0].url);
      if (!imgResponse.ok) {
        return NextResponse.json({ error: 'Failed to download generated image' }, { status: 500 });
      }
      imageBytes = Buffer.from(await imgResponse.arrayBuffer());
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

    return NextResponse.json(
      mapGeneratedImage(image as unknown as Record<string, unknown>),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error generating image:', error);
    return NextResponse.json(
      { error: 'Failed to generate image. Please try again.' },
      { status: 500 }
    );
  }
}
