import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';

/**
 * GET /api/trend-radar/sources — List trend sources
 */
export async function GET() {
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sources = await prisma.trendSource.findMany({
    where: { workspaceId },
    include: {
      _count: { select: { detectedTrends: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ sources });
}

/**
 * POST /api/trend-radar/sources — Add a new trend source
 */
export async function POST(req: NextRequest) {
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { name, url, category, checkInterval = 360 } = body;

  if (!name || !url) {
    return NextResponse.json({ error: 'Name and URL are required' }, { status: 400 });
  }

  // Validate URL
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  // Check for duplicate URL in workspace
  const existing = await prisma.trendSource.findFirst({
    where: { workspaceId, url },
  });
  if (existing) {
    return NextResponse.json({ error: 'This URL is already being monitored' }, { status: 409 });
  }

  const source = await prisma.trendSource.create({
    data: {
      name,
      url,
      category: category || null,
      checkInterval: Math.max(60, Math.min(10080, checkInterval)), // 1h to 7d
      isActive: true,
      status: 'PENDING',
      nextCheckAt: new Date(), // scan immediately
      workspaceId,
    },
    include: {
      _count: { select: { detectedTrends: true } },
    },
  });

  return NextResponse.json({ source }, { status: 201 });
}
