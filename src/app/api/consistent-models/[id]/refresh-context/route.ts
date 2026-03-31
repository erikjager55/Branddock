import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, requireAuth } from '@/lib/auth-server';
import { resolveModelBrandContext } from '@/lib/consistent-models/model-context-resolver';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import type { ConsistentModelType } from '@prisma/client';

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/consistent-models/:id/refresh-context — Re-resolve brand context snapshot */
export async function POST(
  _request: NextRequest,
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

    const model = await prisma.consistentModel.findFirst({
      where: { id, workspaceId },
      select: { id: true, type: true },
    });

    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    const brandContext = await resolveModelBrandContext(workspaceId, model.type as ConsistentModelType);

    const updated = await prisma.consistentModel.update({
      where: { id },
      data: {
        brandContext: (brandContext ?? undefined) as Parameters<typeof prisma.consistentModel.update>[0]['data']['brandContext'],
      },
      include: {
        referenceImages: { orderBy: { sortOrder: 'asc' } },
        createdBy: { select: { id: true, name: true, image: true } },
      },
    });

    invalidateCache(cacheKeys.prefixes.consistentModels(workspaceId));

    return NextResponse.json(updated);
  } catch (error) {
    console.error('POST /api/consistent-models/:id/refresh-context error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
