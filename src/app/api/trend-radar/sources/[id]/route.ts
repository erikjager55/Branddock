import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/trend-radar/sources/[id] — Get source detail
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const source = await prisma.trendSource.findFirst({
    where: { id, workspaceId },
    include: {
      _count: { select: { detectedTrends: true } },
      detectedTrends: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, relevanceScore: true, createdAt: true },
      },
    },
  });

  if (!source) {
    return NextResponse.json({ error: 'Source not found' }, { status: 404 });
  }

  return NextResponse.json(source);
}

/**
 * PATCH /api/trend-radar/sources/[id] — Update source
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.trendSource.findFirst({
    where: { id, workspaceId },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Source not found' }, { status: 404 });
  }

  const allowedFields = ['name', 'url', 'category', 'checkInterval'];
  const data: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) {
      if (key === 'checkInterval') {
        data[key] = Math.max(60, Math.min(10080, body[key]));
      } else {
        data[key] = body[key];
      }
    }
  }

  // Validate URL if changed
  if (data.url) {
    try {
      new URL(data.url as string);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }
  }

  const source = await prisma.trendSource.update({
    where: { id },
    data,
    include: {
      _count: { select: { detectedTrends: true } },
    },
  });

  return NextResponse.json(source);
}

/**
 * DELETE /api/trend-radar/sources/[id] — Delete source (keeps trends)
 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.trendSource.findFirst({
    where: { id, workspaceId },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Source not found' }, { status: 404 });
  }

  // Set trends' trendSourceId to null (onDelete: SetNull in schema)
  await prisma.trendSource.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
