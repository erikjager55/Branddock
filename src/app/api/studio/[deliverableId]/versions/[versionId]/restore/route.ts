import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';

type RouteParams = { params: Promise<{ deliverableId: string; versionId: string }> };

// POST /api/studio/[deliverableId]/versions/[versionId]/restore — Restore from version
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    const { deliverableId, versionId } = await params;

    // Verify deliverable belongs to workspace
    const deliverable = await prisma.deliverable.findFirst({
      where: {
        id: deliverableId,
        campaign: { workspaceId: workspaceId ?? undefined },
      },
      select: { id: true },
    });

    if (!deliverable) {
      return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
    }

    const version = await prisma.contentVersion.findUnique({
      where: { id: versionId },
    });

    if (!version || version.deliverableId !== deliverableId) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    // Extract snapshot data
    const snapshot = version.contentSnapshot as Record<string, unknown>;

    // Restore deliverable content from version snapshot
    await prisma.deliverable.update({
      where: { id: deliverableId },
      data: {
        generatedText: (snapshot.text as string | null) ?? null,
        generatedImageUrls: (snapshot.images as string[]) ?? [],
        generatedVideoUrl: (snapshot.video as string | null) ?? null,
        generatedSlides: snapshot.slides ?? undefined,
        qualityScore: (snapshot.qualityScore as number | null) ?? null,
      },
    });

    return NextResponse.json({
      restored: true,
      versionNumber: version.versionNumber,
    });
  } catch (error) {
    console.error('POST /api/studio/.../versions/.../restore error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
