import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, requireAuth } from '@/lib/auth-server';
import { parseJsonBody } from '@/lib/api/parse-json-body';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';

// L8 Zod-sweep (audit 2026-06-26, batch 2): ~13 velden gingen 1-op-1 in
// prisma.detectedTrend.create; de enum-velden zijn Prisma-enums (een
// ongeldige waarde 500'de), de arrays waren ongevalideerde JSON.
const strArray = z.array(z.string().max(500)).max(100);
const manualTrendSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(10000).optional(),
  category: z
    .enum(['CONSUMER_BEHAVIOR', 'TECHNOLOGY', 'MARKET_DYNAMICS', 'COMPETITIVE', 'REGULATORY'])
    .default('TECHNOLOGY'),
  scope: z.enum(['MICRO', 'MESO', 'MACRO']).default('MICRO'),
  impactLevel: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  timeframe: z.enum(['SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM']).default('SHORT_TERM'),
  relevanceScore: z.number().min(0).max(100).default(75),
  direction: z.string().max(50).nullish(),
  industries: strArray.default([]),
  tags: strArray.default([]),
  howToUse: z.array(z.string().max(2000)).max(100).default([]),
  sourceUrl: z.string().max(2000).nullish(),
  imageUrl: z.string().max(2000).nullish(),
});

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

  const parsed = await parseJsonBody(req, manualTrendSchema);
  if (!parsed.ok) return parsed.response;
  const {
    title,
    description,
    category,
    scope,
    impactLevel,
    timeframe,
    relevanceScore,
    direction,
    industries,
    tags,
    howToUse,
    sourceUrl,
    imageUrl,
  } = parsed.data;

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
