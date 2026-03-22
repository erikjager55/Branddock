import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { cachedJson, setCache } from '@/lib/api/cache';
import { cacheKeys, CACHE_TTL } from '@/lib/api/cache-keys';
import { getAssetCompletenessPercentage } from '@/lib/brand-asset-completeness';

export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 });

    const hit = cachedJson(cacheKeys.dashboard.stats(workspaceId));
    if (hit) return hit;

    const [allAssets, personaCount, productCount, activeCampaigns, activatedTrends, analyzedCompetitors] = await Promise.all([
      prisma.brandAsset.findMany({
        where: { workspaceId },
        select: { description: true, frameworkType: true, frameworkData: true },
      }),
      prisma.persona.count({ where: { workspaceId } }),
      prisma.product.count({ where: { workspaceId } }),
      prisma.campaign.count({ where: { workspaceId, status: 'ACTIVE' } }),
      prisma.detectedTrend.count({ where: { workspaceId, isActivated: true } }),
      prisma.competitor.count({ where: { workspaceId, status: 'ANALYZED' } }),
    ]);

    const fullyComplete = allAssets.filter(a =>
      getAssetCompletenessPercentage({
        description: a.description ?? '',
        frameworkType: a.frameworkType,
        frameworkData: a.frameworkData,
      }) === 100
    ).length;

    const data = {
      brandAssets: { ready: fullyComplete, total: allAssets.length },
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
