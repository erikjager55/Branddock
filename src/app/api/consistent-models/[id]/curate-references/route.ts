import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, requireAuth } from '@/lib/auth-server';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import { z } from 'zod';

type RouteContext = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  selectedIds: z.array(z.string()).min(1),
  deselectedIds: z.array(z.string()).default([]),
});

/** POST /api/consistent-models/:id/curate-references — Mark selected images as training images */
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

    // ─── Verify model ownership ────────────────────────────────
    const model = await prisma.consistentModel.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });

    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    const { selectedIds, deselectedIds } = parsed.data;

    // ─── Update in a transaction ──────────────────────────────
    await prisma.$transaction(async (tx) => {
      if (selectedIds.length > 0) {
        await tx.referenceImage.updateMany({
          where: {
            id: { in: selectedIds },
            consistentModelId: id,
          },
          data: { isTrainingImage: true },
        });
      }

      if (deselectedIds.length > 0) {
        await tx.referenceImage.updateMany({
          where: {
            id: { in: deselectedIds },
            consistentModelId: id,
          },
          data: { isTrainingImage: false },
        });
      }
    });

    // ─── Fetch updated images ─────────────────────────────────
    const updatedImages = await prisma.referenceImage.findMany({
      where: { consistentModelId: id },
      orderBy: { sortOrder: 'asc' },
    });

    invalidateCache(cacheKeys.prefixes.consistentModels(workspaceId));

    return NextResponse.json({
      images: updatedImages,
      trainingCount: updatedImages.filter((img) => img.isTrainingImage).length,
      total: updatedImages.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('POST /api/consistent-models/:id/curate-references error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
