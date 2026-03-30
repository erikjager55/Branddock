import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, requireAuth } from '@/lib/auth-server';
import { isAstriaConfigured, createPrompt } from '@/lib/integrations/astria/astria-client';
import { uploadToR2, buildGenerationStorageKey } from '@/lib/storage/r2-storage';
import { z } from 'zod';

type RouteContext = { params: Promise<{ id: string }> };

const TRIGGER_WORDS: Record<string, string> = {
  PERSON: 'ohwx person',
  PRODUCT: 'ohwx product',
  STYLE: 'ohwx style',
  OBJECT: 'ohwx object',
};

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

    if (!isAstriaConfigured()) {
      return NextResponse.json(
        { error: 'Astria API key not configured.' },
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

    if (!model.astriaModelId) {
      return NextResponse.json(
        { error: 'Model has no Astria model ID. Training may not have completed.' },
        { status: 400 }
      );
    }

    const { prompt, negativePrompt, width, height, seed, guidanceScale, numImages } = parsed.data;

    // Inject trigger word if not present in prompt
    const triggerWord = TRIGGER_WORDS[model.type] ?? 'ohwx';
    const finalPrompt = prompt.includes(triggerWord) ? prompt : `${triggerWord} ${prompt}`;

    // Combine with model-level style/negative prompts
    const combinedNegative = [model.negativePrompt, negativePrompt].filter(Boolean).join(', ') || undefined;

    // Call Astria to generate
    const tuneId = parseInt(model.astriaModelId, 10);
    const astriaResult = await createPrompt(tuneId, {
      text: model.stylePrompt ? `${finalPrompt}, ${model.stylePrompt}` : finalPrompt,
      negativePrompt: combinedNegative,
      numImages: numImages ?? 1,
      seed,
      width,
      height,
      cfgScale: guidanceScale,
    });

    // Process each generated image
    const generations = [];
    const startTime = Date.now();

    for (const imageUrl of astriaResult.images ?? []) {
      try {
        // Download the generated image from Astria
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) continue;

        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

        // Upload to R2
        const storageKey = buildGenerationStorageKey(workspaceId, id);
        const { url: storageUrl } = await uploadToR2(storageKey, imageBuffer, 'image/png');

        // Create generation record
        const generation = await prisma.consistentModelGeneration.create({
          data: {
            consistentModelId: id,
            workspaceId,
            createdById: session.user.id,
            prompt: finalPrompt,
            negativePrompt: combinedNegative ?? null,
            seed: astriaResult.seed ?? seed ?? null,
            width: width ?? 1024,
            height: height ?? 1024,
            guidanceScale: guidanceScale ?? null,
            storageKey,
            storageUrl,
            generationTimeMs: Date.now() - startTime,
            aiProvider: 'astria',
            aiModel: model.astriaModelId!,
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
