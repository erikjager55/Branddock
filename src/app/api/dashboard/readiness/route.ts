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

    const hit = cachedJson(cacheKeys.dashboard.readiness(workspaceId));
    if (hit) return hit;

    const [allAssets, personaCount, productCount, activeCampaignCount, activatedTrends] = await Promise.all([
      prisma.brandAsset.findMany({
        where: { workspaceId },
        select: { description: true, frameworkType: true, frameworkData: true },
      }),
      prisma.persona.count({ where: { workspaceId } }),
      prisma.product.count({ where: { workspaceId } }),
      prisma.campaign.count({ where: { workspaceId, status: 'ACTIVE' } }),
      prisma.detectedTrend.count({ where: { workspaceId, isActivated: true } }),
    ]);

    const totalAssets = allAssets.length;
    const fullyComplete = allAssets.filter(a =>
      getAssetCompletenessPercentage({
        description: a.description ?? '',
        frameworkType: a.frameworkType,
        frameworkData: a.frameworkData,
      }) === 100
    ).length;
    const notComplete = totalAssets - fullyComplete;

    // Per-module scores (0-100)
    // Personas use count-based scoring (20% per persona, max 100%) consistent with products/campaigns
    const moduleScores = {
      brandAssets: totalAssets > 0 ? Math.round((fullyComplete / totalAssets) * 100) : 0,
      personas: Math.min(100, personaCount * 20),
      products: Math.min(100, productCount * 20),
      campaigns: Math.min(100, activeCampaignCount * 25),
      trends: Math.min(100, activatedTrends * 10),
    };

    // Weighted overall score
    const weights = { brandAssets: 0.25, personas: 0.20, products: 0.15, campaigns: 0.20, trends: 0.20 };
    const weightedOverall = Math.round(
      moduleScores.brandAssets * weights.brandAssets +
      moduleScores.personas * weights.personas +
      moduleScores.products * weights.products +
      moduleScores.campaigns * weights.campaigns +
      moduleScores.trends * weights.trends,
    );

    const data = {
      percentage: weightedOverall,
      breakdown: {
        ready: fullyComplete,
        needAttention: notComplete,
        inProgress: 0,
      },
      moduleScores,
    };

    setCache(cacheKeys.dashboard.readiness(workspaceId), data, CACHE_TTL.DASHBOARD);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[GET /api/dashboard/readiness]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
