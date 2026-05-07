import { NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ deliverableId: string; versionId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { deliverableId, versionId } = await params;

    const version = await prisma.contentVersion.findFirst({
      where: {
        id: versionId,
        deliverableId,
        deliverable: { campaign: { workspaceId } },
      },
      include: {
        fidelityScores: {
          select: {
            id: true,
            judgeIdentifier: true,
            compositeScore: true,
            thresholdMet: true,
            scoredAt: true,
            pillarScores: true,
          },
          orderBy: { scoredAt: 'desc' },
        },
      },
    });
    if (!version) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(version);
  } catch (error) {
    console.error('[GET /api/content/[deliverableId]/versions/[versionId]]', error);
    return NextResponse.json({ error: 'Failed to load version' }, { status: 500 });
  }
}
