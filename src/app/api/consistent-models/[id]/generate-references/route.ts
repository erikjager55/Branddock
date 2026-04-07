import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, requireAuth } from '@/lib/auth-server';
import { generateFalImage } from '@/lib/integrations/fal/fal-client';
import { getStorageProvider } from '@/lib/storage';
import { buildReferencePrompts } from '@/lib/consistent-models/reference-prompt-builder';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import type { ConsistentModelType } from '@prisma/client';
import { z } from 'zod';

type RouteContext = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  falModel: z.string().min(1, 'falModel is required'),
  count: z.number().int().min(1).max(24).optional(),
  brandTags: z.array(z.string()),
  typeConfig: z.record(z.string(), z.string()),
});

/** POST /api/consistent-models/:id/generate-references — Generate AI reference images via fal.ai */
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

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const { falModel, brandTags, typeConfig } = parsed.data;

    // ─── Fetch model ──────────────────────────────────────────
    const model = await prisma.consistentModel.findFirst({
      where: { id, workspaceId },
      select: {
        id: true,
        type: true,
        status: true,
        referenceImages: {
          select: { id: true },
          orderBy: { sortOrder: 'desc' },
          take: 1,
        },
      },
    });

    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    if (model.status !== 'DRAFT' && model.status !== 'TRAINING_FAILED') {
      return NextResponse.json(
        { error: `Cannot generate references: model status is ${model.status}. Must be DRAFT or TRAINING_FAILED.` },
        { status: 400 }
      );
    }

    // ─── Build prompts ────────────────────────────────────────
    const modelType = model.type as ConsistentModelType;
    const { prompts: allPrompts } = buildReferencePrompts(brandTags, typeConfig, modelType);

    const count = parsed.data.count ?? Math.min(allPrompts.length, 20);
    const prompts = allPrompts.slice(0, count);

    // ─── Generate images ──────────────────────────────────────
    const storage = getStorageProvider();
    const currentMaxSort = model.referenceImages[0]
      ? await prisma.referenceImage.count({ where: { consistentModelId: id } })
      : 0;

    const results: Array<{
      id: string;
      fileName: string;
      storageUrl: string;
      thumbnailUrl: string | null;
      width: number | null;
      height: number | null;
      aiPrompt: string;
      aiProvider: string;
    }> = [];
    let firstError: string | null = null;

    for (let i = 0; i < prompts.length; i++) {
      const prompt = prompts[i];
      try {
        // Generate image via fal.ai
        const genResult = await generateFalImage(falModel, prompt, {
          imageSize: 'square_hd',
        });

        if (!genResult.images.length) {
          console.error(`fal.ai returned no images for prompt ${i + 1}`);
          continue;
        }

        const image = genResult.images[0];

        // Download image bytes from fal.ai URL
        const imageResponse = await fetch(image.url);
        if (!imageResponse.ok) {
          console.error(`Failed to download image from fal.ai: ${imageResponse.status}`);
          continue;
        }

        const imageArrayBuffer = await imageResponse.arrayBuffer();
        const imageBytes = Buffer.from(imageArrayBuffer);
        const contentType = image.content_type ?? imageResponse.headers.get('content-type') ?? 'image/png';

        // Upload to storage
        const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png';
        const fileName = `ref-${modelType.toLowerCase()}-${Date.now()}-${i}.${ext}`;

        const uploadResult = await storage.upload(imageBytes, {
          workspaceId,
          fileName,
          contentType,
          generateThumbnail: true,
        });

        // Create ReferenceImage record
        const refImage = await prisma.referenceImage.create({
          data: {
            consistentModelId: id,
            fileName,
            fileSize: uploadResult.fileSize,
            mimeType: contentType,
            width: image.width ?? uploadResult.width ?? 1024,
            height: image.height ?? uploadResult.height ?? 1024,
            storageKey: uploadResult.url,
            storageUrl: uploadResult.url,
            thumbnailKey: uploadResult.thumbnailUrl ?? uploadResult.url,
            thumbnailUrl: uploadResult.thumbnailUrl ?? uploadResult.url,
            sortOrder: currentMaxSort + i,
            isTrainingImage: false,
            source: 'AI_GENERATED',
            aiProvider: falModel,
            aiModel: falModel,
            aiPrompt: prompt,
            generatedAt: new Date(),
          },
        });

        results.push({
          id: refImage.id,
          fileName: refImage.fileName,
          storageUrl: refImage.storageUrl,
          thumbnailUrl: refImage.thumbnailUrl,
          width: refImage.width,
          height: refImage.height,
          aiPrompt: refImage.aiPrompt ?? prompt,
          aiProvider: falModel,
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`Failed to generate reference image ${i + 1}/${prompts.length}:`, errMsg);
        if (!firstError) firstError = errMsg;
        // Continue generating remaining images even if one fails
      }
    }

    if (results.length === 0) {
      return NextResponse.json(
        { error: `Failed to generate reference images with ${falModel}. ${firstError ?? 'Check fal.ai configuration (FAL_KEY).'}` },
        { status: 500 }
      );
    }

    invalidateCache(cacheKeys.prefixes.consistentModels(workspaceId));

    return NextResponse.json({
      generated: results,
      total: results.length,
      provider: falModel,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('POST /api/consistent-models/:id/generate-references error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
