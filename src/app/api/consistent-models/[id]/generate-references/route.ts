import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, requireAuth } from '@/lib/auth-server';
import { generateImage } from '@/lib/ai/gemini-client';
import { generateDalleImage } from '@/lib/ai/openai-client';
import { getStorageProvider } from '@/lib/storage';
import { buildReferencePrompts } from '@/lib/consistent-models/reference-prompt-builder';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import type { ModelBrandContext } from '@/features/consistent-models/types/consistent-model.types';
import type { ConsistentModelType } from '@prisma/client';
import { z } from 'zod';

type RouteContext = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  provider: z.enum(['imagen', 'dalle']).optional(),
  count: z.number().int().min(1).max(6).optional(),
});

/** POST /api/consistent-models/:id/generate-references — Generate AI reference images */
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

    // ─── Fetch model ──────────────────────────────────────────
    const model = await prisma.consistentModel.findFirst({
      where: { id, workspaceId },
      select: {
        id: true,
        type: true,
        status: true,
        brandContext: true,
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
    const brandContext = model.brandContext as ModelBrandContext | null;
    const modelType = model.type as ConsistentModelType;
    const { prompts: allPrompts, provider: defaultProvider } = buildReferencePrompts(brandContext, modelType);

    const provider = parsed.data.provider ?? defaultProvider;
    const count = parsed.data.count ?? Math.min(allPrompts.length, 4);
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

    for (let i = 0; i < prompts.length; i++) {
      const prompt = prompts[i];
      try {
        let imageBytes: Buffer;
        let mimeType: string;
        let aiModel: string;
        let revisedPrompt: string | undefined;

        if (provider === 'dalle') {
          const result = await generateDalleImage(prompt, {
            size: '1024x1024',
            quality: 'hd',
            style: 'natural',
          });
          imageBytes = result.imageBytes;
          mimeType = result.mimeType;
          aiModel = 'dall-e-3';
          revisedPrompt = result.revisedPrompt;
        } else {
          const result = await generateImage(prompt, {
            aspectRatio: '1:1',
          });
          imageBytes = result.imageBytes;
          mimeType = result.mimeType;
          aiModel = 'imagen-4';
        }

        // Upload to storage
        const ext = mimeType === 'image/png' ? 'png' : 'jpg';
        const fileName = `ref-${modelType.toLowerCase()}-${Date.now()}-${i}.${ext}`;

        const uploadResult = await storage.upload(Buffer.from(imageBytes), {
          workspaceId,
          fileName,
          contentType: mimeType,
          generateThumbnail: true,
        });

        // Create ReferenceImage record
        const image = await prisma.referenceImage.create({
          data: {
            consistentModelId: id,
            fileName,
            fileSize: uploadResult.fileSize,
            mimeType,
            width: uploadResult.width ?? 1024,
            height: uploadResult.height ?? 1024,
            storageKey: uploadResult.url,
            storageUrl: uploadResult.url,
            thumbnailKey: uploadResult.thumbnailUrl ?? uploadResult.url,
            thumbnailUrl: uploadResult.thumbnailUrl ?? uploadResult.url,
            sortOrder: currentMaxSort + i,
            isTrainingImage: false, // User must curate/select before training
            source: 'AI_GENERATED',
            aiProvider: provider,
            aiModel,
            aiPrompt: revisedPrompt ?? prompt,
            generatedAt: new Date(),
          },
        });

        results.push({
          id: image.id,
          fileName: image.fileName,
          storageUrl: image.storageUrl,
          thumbnailUrl: image.thumbnailUrl,
          width: image.width,
          height: image.height,
          aiPrompt: image.aiPrompt ?? prompt,
          aiProvider: provider,
        });
      } catch (err) {
        console.error(`Failed to generate reference image ${i + 1}/${prompts.length}:`, err);
        // Continue generating remaining images even if one fails
      }
    }

    if (results.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate any reference images. Check AI provider configuration.' },
        { status: 500 }
      );
    }

    invalidateCache(cacheKeys.prefixes.consistentModels(workspaceId));

    return NextResponse.json({
      generated: results,
      total: results.length,
      provider,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('POST /api/consistent-models/:id/generate-references error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
