import { NextRequest, NextResponse } from 'next/server';
import { resolveWorkspaceId, requireAuth } from '@/lib/auth-server';
import { pollTrainingStatus } from '@/lib/consistent-models/training-poller';
import { prisma } from '@/lib/prisma';

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/consistent-models/:id/training-status — Poll training progress */
export async function GET(
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

    const result = await pollTrainingStatus(id, workspaceId);

    // Enrich response with DB fields for the frontend
    const model = await prisma.consistentModel.findFirst({
      where: { id, workspaceId },
      select: {
        status: true,
        replicateModelId: true,
        replicateTrainingId: true,
        trainingStartedAt: true,
        trainingCompletedAt: true,
        trainingError: true,
        sampleImageUrls: true,
      },
    });

    return NextResponse.json({
      ...result,
      status: model?.status ?? result.status,
      replicateModelId: model?.replicateModelId ?? null,
      replicateTrainingId: model?.replicateTrainingId ?? null,
      trainingStartedAt: model?.trainingStartedAt?.toISOString() ?? null,
      trainingCompletedAt: model?.trainingCompletedAt?.toISOString() ?? null,
      trainingError: model?.trainingError ?? result.error ?? null,
      sampleImageUrls: model?.sampleImageUrls ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('GET /api/consistent-models/:id/training-status error:', error);

    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
