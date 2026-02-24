import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { createVersion } from '@/lib/versioning';
import { buildPersonaSnapshot, buildBrandAssetSnapshot, buildStrategySnapshot, buildProductSnapshot } from '@/lib/snapshot-builders';
import type { VersionedResourceType, VersionChangeType } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const resourceType = searchParams.get('type') as VersionedResourceType;
    const resourceId = searchParams.get('resourceId');

    if (!resourceType || !resourceId) {
      return NextResponse.json({ error: 'type and resourceId required' }, { status: 400 });
    }

    const versions = await prisma.resourceVersion.findMany({
      where: { resourceType, resourceId, workspaceId },
      orderBy: { version: 'desc' },
      take: 50,
      select: {
        id: true,
        version: true,
        label: true,
        changeNote: true,
        changeType: true,
        diff: true,
        createdAt: true,
        createdBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ versions });
  } catch (error) {
    console.error('[GET /api/versions]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 });
    const session = await getServerSession();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { resourceType, resourceId, changeType, changeNote, label } = body as {
      resourceType: VersionedResourceType;
      resourceId: string;
      changeType: VersionChangeType;
      changeNote?: string;
      label?: string;
    };

    if (!resourceType || !resourceId) {
      return NextResponse.json({ error: 'resourceType and resourceId required' }, { status: 400 });
    }

    // Build snapshot from current state
    let snapshot: Record<string, unknown>;
    switch (resourceType) {
      case 'PERSONA': {
        const record = await prisma.persona.findFirst({ where: { id: resourceId, workspaceId } });
        if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        snapshot = buildPersonaSnapshot(record);
        break;
      }
      case 'BRAND_ASSET': {
        const record = await prisma.brandAsset.findFirst({ where: { id: resourceId, workspaceId } });
        if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        snapshot = buildBrandAssetSnapshot(record);
        break;
      }
      case 'STRATEGY': {
        const record = await prisma.businessStrategy.findFirst({ where: { id: resourceId, workspaceId } });
        if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        snapshot = buildStrategySnapshot(record);
        break;
      }
      case 'PRODUCT': {
        const record = await prisma.product.findFirst({ where: { id: resourceId, workspaceId } });
        if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        snapshot = buildProductSnapshot(record);
        break;
      }
      default:
        return NextResponse.json({ error: 'Unsupported resource type' }, { status: 400 });
    }

    const version = await createVersion({
      resourceType,
      resourceId,
      snapshot,
      changeType: changeType ?? 'MANUAL_SAVE',
      changeNote,
      label,
      userId: session.user.id,
      workspaceId,
    });

    return NextResponse.json({ version });
  } catch (error) {
    console.error('[POST /api/versions]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
