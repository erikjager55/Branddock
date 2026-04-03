import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, requireAuth } from '@/lib/auth-server';
import { isFalConfigured, runFalGeneration } from '@/lib/integrations/fal/fal-client';
import { getStorageProvider } from '@/lib/storage';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { TRIGGER_WORDS } from '@/features/consistent-models/constants/model-constants';
import type { ConsistentModelType } from '@prisma/client';
import { z } from 'zod';

type RouteContext = { params: Promise<{ id: string }> };

const generateSchema = z.object({
  prompt: z.string().trim().min(1).max(2000),
  negativePrompt: z.string().trim().max(2000).optional(),
  width: z.number().int().min(512).max(1536).optional(),
  height: z.number().int().min(512).max(1536).optional(),
  seed: z.number().int().optional(),
  guidanceScale: z.number().min(1).max(20).optional(),
  numImages: z.number().int().min(1).max(4).optional(),
  saveToLibrary: z.boolean().optional(),
});

/** POST /api/consistent-models/:id/generate — Generate image with trained model */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await requireAuth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace' }, { status: 400 });
    }

    if (!isFalConfigured()) {
      return NextResponse.json(
        { error: 'fal.ai API key not configured. Add FAL_KEY to environment.' },
        { status: 503 }
      );
    }

    const { id } = await context.params;

    const body = await request.json();
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    // Fetch model and verify ownership + status
    const model = await prisma.consistentModel.findFirst({
      where: { id, workspaceId },
    });

    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    if (model.status !== 'READY') {
      return NextResponse.json(
        { error: `Model is not ready for generation. Current status: ${model.status}` },
        { status: 400 }
      );
    }

    if (!model.falLoraUrl) {
      return NextResponse.json(
        { error: 'Model has no trained LoRA weights. Training may not have completed.' },
        { status: 400 }
      );
    }

    const { prompt, negativePrompt, width, height, seed, guidanceScale, numImages } = parsed.data;

    // Inject trigger word if not present in prompt
    const triggerWord = TRIGGER_WORDS[model.type as ConsistentModelType] ?? 'TOK';
    const finalPrompt = prompt.includes(triggerWord) ? prompt : `${triggerWord} ${prompt}`;

    // Combine with model-level style/negative prompts
    const combinedPrompt = model.stylePrompt ? `${finalPrompt}, ${model.stylePrompt}` : finalPrompt;

    // Call fal.ai to generate
    const generatorEndpoint = model.generatorEndpoint ?? 'fal-ai/flux-lora';
    const result = await runFalGeneration(generatorEndpoint, {
      prompt: combinedPrompt,
      loras: [{ path: model.falLoraUrl!, scale: 1.0 }],
      num_images: numImages ?? 1,
      guidance_scale: guidanceScale ?? 7.5,
      image_size: { width: width ?? 1024, height: height ?? 1024 },
      seed,
      output_format: 'png',
    });

    // Process each generated image
    const generations = [];
    const startTime = Date.now();
    const storage = getStorageProvider();

    for (const image of result.images ?? []) {
      try {
        // Download the generated image from fal.ai
        const imageResponse = await fetch(image.url);
        if (!imageResponse.ok) continue;

        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

        // Upload via storage provider (local storage for now, R2 later)
        const storageResult = await storage.upload(imageBuffer, {
          workspaceId,
          fileName: `generation-${Date.now()}.png`,
          contentType: 'image/png',
        });

        // Create generation record
        const generation = await prisma.consistentModelGeneration.create({
          data: {
            consistentModelId: id,
            workspaceId,
            createdById: session.user.id,
            prompt: finalPrompt,
            negativePrompt: negativePrompt ?? null,
            seed: seed ?? null,
            width: width ?? 1024,
            height: height ?? 1024,
            guidanceScale: guidanceScale ?? null,
            storageKey: storageResult.url,
            storageUrl: storageResult.url,
            generationTimeMs: Date.now() - startTime,
            aiProvider: 'fal',
            aiModel: generatorEndpoint,
          },
        });

        generations.push(generation);
      } catch (dlError) {
        console.error('Failed to process generated image:', dlError);
      }
    }

    // Update usage count
    if (generations.length > 0) {
      await prisma.consistentModel.update({
        where: { id },
        data: { usageCount: { increment: generations.length } },
      });
    }

    invalidateCache(cacheKeys.prefixes.consistentModels(workspaceId));

    return NextResponse.json({ generations });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('POST /api/consistent-models/:id/generate error:', error);

    if (message.includes('not ready') || message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
