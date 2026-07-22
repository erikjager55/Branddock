import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, requireAuth } from '@/lib/auth-server';
import { generateFalImage, isFalConfigured } from '@/lib/integrations/fal/fal-client';
import { maxAnchorsForModel } from '@/lib/ai/brand-style-anchors';
import { getStorageProvider } from '@/lib/storage';
import { resolveStorageUrls } from '@/lib/storage/resolve-storage-url';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { chargeAfter } from '@/lib/billing/credits/meter-generation';
import { MIN_REFERENCE_IMAGES_FOR_GENERATION, REFERENCE_GENERATOR_MODEL } from '@/features/consistent-models/constants/model-constants';
import { validateGeneratedImage } from '@/lib/consistent-models/style-validator';
import type { IllustrationStyleProfile } from '@/lib/consistent-models/style-profile.types';
import { z } from 'zod';
import { withAiRateLimit } from '@/lib/ai/middleware';
import { fetchWithSizeLimit, AI_IMAGE_SIZE_CAP } from '@/lib/security/fetch-with-limit';
import { enforceNotLocked } from "@/lib/stripe/enforcement";

type RouteContext = { params: Promise<{ id: string }> };

const generateSchema = z.object({
  prompt: z.string().trim().min(1).max(2000),
  negativePrompt: z.string().trim().max(2000).optional(),
  width: z.number().int().min(512).max(1536).optional(),
  height: z.number().int().min(512).max(1536).optional(),
  seed: z.number().int().optional(),
  // Legacy LoRA-parameter — geaccepteerd voor client-compat, niet meer gebruikt.
  guidanceScale: z.number().min(1).max(20).optional(),
  numImages: z.number().int().min(1).max(4).optional(),
  saveToLibrary: z.boolean().optional(),
});

type FalImageSize = 'square_hd' | 'landscape_16_9' | 'portrait_16_9' | 'landscape_4_3' | 'portrait_4_3';

/** Kies het dichtstbijzijnde fal-size-preset bij een gevraagde breedte/hoogte. */
function presetForDims(width?: number, height?: number): FalImageSize {
  const w = width ?? 1024;
  const h = height ?? 1024;
  const ratio = w / h;
  if (ratio >= 1.4) return 'landscape_16_9';
  if (ratio > 1.05) return 'landscape_4_3';
  if (ratio <= 0.6) return 'portrait_16_9';
  if (ratio < 0.95) return 'portrait_4_3';
  return 'square_hd';
}

/**
 * POST /api/consistent-models/:id/generate — Generate on-style image.
 *
 * Trainer-ombouw 2026-07-21: geen LoRA meer — de referentiebeelden van het
 * model gaan als image_urls (multi-ref) rechtstreeks mee in de generatie,
 * hetzelfde mechanisme als de brand-style anchors (F40). Directe start,
 * geen trainingskosten, en de kwaliteit stijgt mee met elk nieuw beeldmodel.
 */
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

    // Fase 4: verlopen no-card trial -> generatie dicht (read-only-lock).
    const trialLock = await enforceNotLocked(workspaceId);
    if (trialLock) return trialLock;

    const rateLimit = await withAiRateLimit(workspaceId);
    if (rateLimit instanceof Response) return rateLimit;

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

    // Fetch model + reference images and verify ownership
    const model = await prisma.consistentModel.findFirst({
      where: { id, workspaceId },
      include: {
        referenceImages: {
          where: { isTrainingImage: true },
          orderBy: { sortOrder: 'asc' },
          select: { storageUrl: true },
        },
      },
    });

    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    if (model.referenceImages.length < MIN_REFERENCE_IMAGES_FOR_GENERATION) {
      return NextResponse.json(
        { error: `Upload at least ${MIN_REFERENCE_IMAGES_FOR_GENERATION} reference images before generating. Currently: ${model.referenceImages.length}.` },
        { status: 400 }
      );
    }

    const { prompt, negativePrompt, width, height, seed, numImages } = parsed.data;

    // Combine with model-level style prompt (+ style-profile prompts for ILLUSTRATION)
    const styleProfile = model.styleProfile as Record<string, unknown> | null;
    const profilePrompts = styleProfile?.generatedPrompts as { stylePrompt?: string; negativePrompt?: string } | undefined;

    const combinedPrompt = [prompt, model.stylePrompt, profilePrompts?.stylePrompt]
      .filter(Boolean)
      .join(', ');

    // Merge negative prompts: user > style profile > model default
    const mergedNegative = [
      negativePrompt,
      profilePrompts?.negativePrompt,
      model.negativePrompt,
    ]
      .filter(Boolean)
      .join(', ') || undefined;

    // Referentiebeelden als multi-ref image_urls, gecapt per generator.
    // Resolve naar een nú-bereikbare URL: oude rijen dragen verlopen signed
    // R2-URLs die fal niet kan downloaden — de stijl wordt dan stil genegeerd.
    const referenceImageUrls = await resolveStorageUrls(
      model.referenceImages
        .map((img) => img.storageUrl)
        .slice(0, maxAnchorsForModel(REFERENCE_GENERATOR_MODEL)),
    );

    const result = await generateFalImage(REFERENCE_GENERATOR_MODEL, combinedPrompt, {
      negativePrompt: mergedNegative,
      numImages: numImages ?? 1,
      seed,
      imageSize: presetForDims(width, height),
      referenceImageUrls,
      resolution: '4K',
    });

    // Process each generated image
    const generations = [];
    const startTime = Date.now();
    const storage = getStorageProvider();

    for (const image of result.images ?? []) {
      try {
        // Download the generated image from fal.ai (size-capped)
        let imageBuffer: Buffer;
        try {
          imageBuffer = await fetchWithSizeLimit(image.url, AI_IMAGE_SIZE_CAP);
        } catch (err) {
          console.warn('[consistent-models/generate] Skipping image:', err instanceof Error ? err.message : err);
          continue;
        }

        // Upload via storage provider
        const storageResult = await storage.upload(imageBuffer, {
          workspaceId,
          fileName: `generation-${Date.now()}.png`,
          contentType: 'image/png',
        });

        // Run style validation if ILLUSTRATION model has a style profile
        let validationScore: number | null = null;
        let validationDetails: Record<string, unknown> | null = null;

        if (model.type === 'ILLUSTRATION' && styleProfile) {
          try {
            const validation = await validateGeneratedImage(
              imageBuffer,
              styleProfile as unknown as IllustrationStyleProfile,
            );
            validationScore = validation.overallScore;
            validationDetails = validation as unknown as Record<string, unknown>;
          } catch (valError) {
            console.error('[generate] Style validation failed (non-blocking):', valError);
          }
        }

        // Create generation record
        const generation = await prisma.consistentModelGeneration.create({
          data: {
            consistentModelId: id,
            workspaceId,
            createdById: session.user.id,
            prompt,
            negativePrompt: negativePrompt ?? null,
            seed: seed ?? null,
            width: width ?? 1024,
            height: height ?? 1024,
            guidanceScale: null,
            storageKey: storageResult.url,
            storageUrl: storageResult.url,
            generationTimeMs: Date.now() - startTime,
            aiProvider: 'fal',
            aiModel: REFERENCE_GENERATOR_MODEL,
            styleValidationScore: validationScore,
            styleValidationDetails: validationDetails ? JSON.parse(JSON.stringify(validationDetails)) : undefined,
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

    // Credit-afboeking (Fase 2): count = werkelijk gegenereerde beelden.
    await chargeAfter(
      { workspaceId, action: 'image', feature: 'consistent-model' },
      { count: generations.length },
    ).catch(() => {});

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
