import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';

/**
 * GET /api/trend-radar/sources — List trend sources
 */
export async function GET(req: NextRequest) {
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const search = url.searchParams.get('search');

  const where: Record<string, unknown> = { workspaceId };
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { url: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [sources, total] = await Promise.all([
    prisma.trendSource.findMany({
      where: where as never,
      include: {
        _count: { select: { detectedTrends: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.trendSource.count({ where: where as never }),
  ]);

  return NextResponse.json({ sources, total });
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

  return NextResponse.json(source, { status: 201 });
}
