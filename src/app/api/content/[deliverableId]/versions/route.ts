import { NextResponse } from 'next/server';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { createContentVersion } from '@/lib/learning-loop/content-version';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';

const LIST_LIMIT_DEFAULT = 50;
const LIST_LIMIT_MAX = 200;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ deliverableId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { deliverableId } = await params;
    const url = new URL(request.url);
    const requestedLimit = Number(url.searchParams.get('limit') ?? LIST_LIMIT_DEFAULT);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(1, Math.floor(requestedLimit)), LIST_LIMIT_MAX)
      : LIST_LIMIT_DEFAULT;

    const deliverable = await prisma.deliverable.findFirst({
      where: { id: deliverableId, campaign: { workspaceId } },
      select: { id: true },
    });
    if (!deliverable) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const versions = await prisma.contentVersion.findMany({
      where: { deliverableId },
      orderBy: { versionNumber: 'desc' },
      take: limit,
      select: {
        id: true,
        versionNumber: true,
        createdAt: true,
        createdBy: true,
        editType: true,
        editorUserId: true,
        primaryCallTraceId: true,
        diffSummary: true,
        qualityScore: true,
      },
    });

    return NextResponse.json({ versions, total: versions.length });
  } catch (error) {
    console.error('[GET /api/content/[deliverableId]/versions]', error);
    return NextResponse.json({ error: 'Failed to load versions' }, { status: 500 });
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ deliverableId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await getServerSession();
    const userId = session?.user.id ?? null;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { deliverableId } = await params;

    const version = await createContentVersion({
      deliverableId,
      workspaceId,
      createdBy: 'USER',
      editorUserId: userId,
    });

    invalidateCache(cacheKeys.prefixes.contentVersions(deliverableId));

    return NextResponse.json(version);
  } catch (error) {
    console.error('[POST /api/content/[deliverableId]/versions]', error);
    return NextResponse.json({ error: 'Failed to create version' }, { status: 500 });
  }
}
