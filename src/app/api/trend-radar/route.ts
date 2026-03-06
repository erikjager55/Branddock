import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';

/**
 * GET /api/trend-radar — List detected trends with filters
 */
export async function GET(req: NextRequest) {
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const category = url.searchParams.get('category');
  const impactLevel = url.searchParams.get('impactLevel');
  const timeframe = url.searchParams.get('timeframe');
  const search = url.searchParams.get('search');
  const activated = url.searchParams.get('activated');
  const dismissed = url.searchParams.get('dismissed');
  const detectionSource = url.searchParams.get('detectionSource');
  const sortBy = url.searchParams.get('sortBy') ?? 'createdAt';
  const sortOrder = (url.searchParams.get('sortOrder') ?? 'desc') as 'asc' | 'desc';

  const where: Record<string, unknown> = { workspaceId };
  if (category) where.category = category;
  if (impactLevel) where.impactLevel = impactLevel;
  if (timeframe) where.timeframe = timeframe;
  if (detectionSource) where.detectionSource = detectionSource;
  if (activated === 'true') where.isActivated = true;
  if (activated === 'false') where.isActivated = false;
  if (dismissed === 'true') where.isDismissed = true;
  if (dismissed === 'false') where.isDismissed = false;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { tags: { has: search } },
    ];
  }

  const [trends, total] = await Promise.all([
    prisma.detectedTrend.findMany({
      where: where as never,
      include: {
        researchJob: { select: { id: true, query: true } },
        activatedBy: { select: { id: true, name: true } },
      },
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.detectedTrend.count({ where: where as never }),
  ]);

  return NextResponse.json({ trends, total });
}
