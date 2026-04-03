import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, requireAuth } from '@/lib/auth-server';
import { isFalConfigured } from '@/lib/integrations/fal/fal-client';
import { startTraining } from '@/lib/consistent-models/training-pipeline';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { MIN_IMAGES_BY_TYPE } from '@/features/consistent-models/constants/model-constants';
import type { ConsistentModelType } from '@prisma/client';
import { z } from 'zod';

type RouteContext = { params: Promise<{ id: string }> };

const trainSchema = z.object({
  steps: z.number().int().min(100).max(4000).optional(),
  learningRate: z.number().min(0.00001).max(0.01).optional(),
  resolution: z.number().int().min(512).max(1536).optional(),
});

/** POST /api/consistent-models/:id/train — Start fine-tuning */
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
    const parsed = trainSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    // ─── Validation ───────────────────────────────────────────
    const model = await prisma.consistentModel.findFirst({
      where: { id, workspaceId },
      include: {
        referenceImages: {
          where: { isTrainingImage: true },
          select: { id: true },
        },
      },
    });

    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    if (model.status !== 'DRAFT' && model.status !== 'TRAINING_FAILED') {
      return NextResponse.json(
        { error: `Cannot start training: model status is ${model.status}. Must be DRAFT or TRAINING_FAILED.` },
        { status: 400 }
      );
    }

    const minRequired = MIN_IMAGES_BY_TYPE[model.type as ConsistentModelType] ?? 5;
    if (model.referenceImages.length < minRequired) {
      return NextResponse.json(
        { error: `Need at least ${minRequired} reference images for ${model.type} models. Got ${model.referenceImages.length}.` },
        { status: 400 }
      );
    }

    // ─── fal.ai training ──────────────────────────────────────
    if (!isFalConfigured()) {
      return NextResponse.json(
        { error: 'fal.ai API key not configured. Add FAL_KEY to environment.' },
        { status: 503 }
      );
    }

    const result = await startTraining(id, workspaceId);

    invalidateCache(cacheKeys.prefixes.consistentModels(workspaceId));

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    console.error('POST /api/consistent-models/:id/train error:', message, stack);

    if (message.includes('Cannot start') || message.includes('Need at least') || message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
