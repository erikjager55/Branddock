import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/trend-radar/[id] — Get trend detail
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const trend = await prisma.detectedTrend.findFirst({
    where: { id, workspaceId },
    include: {
      researchJob: { select: { id: true, query: true } },
      activatedBy: { select: { id: true, name: true } },
    },
  });

  if (!trend) {
    return NextResponse.json({ error: 'Trend not found' }, { status: 404 });
  }

  return NextResponse.json(trend);
}

/**
 * PATCH /api/trend-radar/[id] — Update trend fields
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  // Verify ownership
  const existing = await prisma.detectedTrend.findFirst({
    where: { id, workspaceId },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Trend not found' }, { status: 404 });
  }

  const allowedFields = [
    'title', 'description', 'category', 'scope', 'impactLevel',
    'timeframe', 'relevanceScore', 'direction', 'industries',
    'tags', 'howToUse', 'sourceUrl',
  ];

  const data: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) data[key] = body[key];
  }

  const trend = await prisma.detectedTrend.update({
    where: { id },
    data,
    include: {
      researchJob: { select: { id: true, query: true } },
      activatedBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(trend);
}

/**
 * DELETE /api/trend-radar/[id] — Delete trend
 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.detectedTrend.findFirst({
    where: { id, workspaceId },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Trend not found' }, { status: 404 });
  }

  await prisma.detectedTrend.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
