import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, requireAuth } from '@/lib/auth-server';

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/consistent-models/:id/generations — List generated images */
export async function GET(
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

    // Verify model ownership
    const model = await prisma.consistentModel.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });

    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0', 10);

    const [generations, total] = await Promise.all([
      prisma.consistentModelGeneration.findMany({
        where: { consistentModelId: id, workspaceId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          createdBy: { select: { id: true, name: true, image: true } },
        },
      }),
      prisma.consistentModelGeneration.count({
        where: { consistentModelId: id, workspaceId },
      }),
    ]);

    return NextResponse.json({
      generations,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('GET /api/consistent-models/:id/generations error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
