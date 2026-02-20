import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';

type RouteParams = { params: Promise<{ deliverableId: string }> };

// GET /api/studio/[deliverableId]/versions — List content versions
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    const { deliverableId } = await params;

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

    const versions = await prisma.contentVersion.findMany({
      where: { deliverableId },
      orderBy: { versionNumber: 'desc' },
      select: {
        id: true,
        versionNumber: true,
        qualityScore: true,
        createdAt: true,
        createdBy: true,
      },
    });

    return NextResponse.json({
      versions: versions.map((v) => ({
        id: v.id,
        versionNumber: v.versionNumber,
        qualityScore: v.qualityScore,
        createdAt: v.createdAt.toISOString(),
        createdBy: v.createdBy,
      })),
    });
  } catch (error) {
    console.error('GET /api/studio/[deliverableId]/versions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/studio/[deliverableId]/versions — Create new version snapshot
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    const { deliverableId } = await params;

    const deliverable = await prisma.deliverable.findFirst({
      where: {
        id: deliverableId,
        campaign: { workspaceId: workspaceId ?? undefined },
      },
    });

    if (!deliverable) {
      return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
    }

    // Get the current max version number
    const lastVersion = await prisma.contentVersion.findFirst({
      where: { deliverableId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });

    const nextVersion = (lastVersion?.versionNumber ?? 0) + 1;

    // Create snapshot of current content
    const snapshot = {
      text: deliverable.generatedText,
      images: deliverable.generatedImageUrls,
      video: deliverable.generatedVideoUrl,
      slides: deliverable.generatedSlides,
      qualityScore: deliverable.qualityScore,
    };

    const version = await prisma.contentVersion.create({
      data: {
        versionNumber: nextVersion,
        contentSnapshot: snapshot,
        qualityScore: deliverable.qualityScore,
        deliverableId,
      },
    });

    return NextResponse.json({
      id: version.id,
      versionNumber: version.versionNumber,
      qualityScore: version.qualityScore,
      createdAt: version.createdAt.toISOString(),
      createdBy: version.createdBy,
    });
  } catch (error) {
    console.error('POST /api/studio/[deliverableId]/versions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
