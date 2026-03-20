import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { cachedJson, setCache } from '@/lib/api/cache';
import { cacheKeys, CACHE_TTL } from '@/lib/api/cache-keys';
import { getBrandAssetStatusCounts } from '@/lib/db/queries';

export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 });

    const hit = cachedJson(cacheKeys.dashboard.stats(workspaceId));
    if (hit) return hit;

    const [counts, personaCount, productCount, activeCampaigns, activatedTrends, analyzedCompetitors] = await Promise.all([
      getBrandAssetStatusCounts(workspaceId),
      prisma.persona.count({ where: { workspaceId } }),
      prisma.product.count({ where: { workspaceId } }),
      prisma.campaign.count({ where: { workspaceId, status: 'ACTIVE' } }),
      prisma.detectedTrend.count({ where: { workspaceId, isActivated: true } }),
      prisma.competitor.count({ where: { workspaceId, status: 'ANALYZED' } }),
    ]);

    const data = {
      brandAssets: { ready: counts.ready, total: counts.total },
      personas: personaCount,
      products: productCount,
      campaigns: activeCampaigns,
      trends: activatedTrends,
      competitors: analyzedCompetitors,
    };

    setCache(cacheKeys.dashboard.stats(workspaceId), data, CACHE_TTL.DASHBOARD);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[GET /api/dashboard/stats]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
