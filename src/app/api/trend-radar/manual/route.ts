import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, requireAuth } from '@/lib/auth-server';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';

/**
 * POST /api/trend-radar/manual — Add a trend manually
 */
export async function POST(req: NextRequest) {
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = await requireAuth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const {
    title,
    description,
    category = 'TECHNOLOGY',
    scope = 'MICRO',
    impactLevel = 'MEDIUM',
    timeframe = 'SHORT_TERM',
    relevanceScore = 75,
    direction,
    industries = [],
    tags = [],
    howToUse = [],
    sourceUrl,
    imageUrl,
  } = body;

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  // Generate unique slug
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);

  let slug = baseSlug;
  let attempt = 0;
  while (await prisma.detectedTrend.findUnique({ where: { slug } })) {
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  const trend = await prisma.detectedTrend.create({
    data: {
      title,
      slug,
      description,
      category,
      scope,
      impactLevel,
      timeframe,
      relevanceScore: Math.max(0, Math.min(100, relevanceScore)),
      direction: direction || null,
      industries,
      tags,
      howToUse,
      sourceUrl: sourceUrl || null,
      imageUrl: imageUrl || null,
      detectionSource: 'MANUAL',
      isActivated: true,
      activatedAt: new Date(),
      activatedById: session.user.id,
      workspaceId,
    },
    include: {
      researchJob: { select: { id: true, query: true } },
    },
  });

  // Invalidate trend radar cache so GET /api/trend-radar returns fresh data
  invalidateCache(cacheKeys.prefixes.trendRadar(workspaceId));
  invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

  return NextResponse.json(trend, { status: 201 });
}
