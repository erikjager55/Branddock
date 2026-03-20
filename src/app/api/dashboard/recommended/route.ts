import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { cachedJson, setCache } from '@/lib/api/cache';
import { cacheKeys, CACHE_TTL } from '@/lib/api/cache-keys';
import type { RecommendedAction } from '@/types/dashboard';

export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 });

    const hit = cachedJson(cacheKeys.dashboard.recommended(workspaceId));
    if (hit) return hit;

    const [
      assetCount,
      leastCompleteAsset,
      personaCount,
      personasWithoutExploration,
      productCount,
      highRelevanceTrendCount,
      campaignsWithoutStrategy,
    ] = await Promise.all([
      prisma.brandAsset.count({ where: { workspaceId } }),
      prisma.brandAsset.findFirst({
        where: { workspaceId, status: { not: 'READY' } },
        orderBy: { updatedAt: 'asc' },
        select: { id: true, name: true },
      }),
      prisma.persona.count({ where: { workspaceId } }),
      prisma.persona.findFirst({
        where: {
          workspaceId,
          researchMethods: { none: { method: 'AI_EXPLORATION', status: 'COMPLETED' } },
        },
        select: { id: true, name: true },
      }),
      prisma.product.count({ where: { workspaceId } }),
      prisma.detectedTrend.count({
        where: { workspaceId, relevanceScore: { gte: 80 }, isActivated: false, isDismissed: false },
      }),
      prisma.campaign.findFirst({
        where: { workspaceId, status: 'ACTIVE', type: 'STRATEGIC', strategy: { equals: Prisma.DbNull } },
        select: { id: true, title: true },
      }),
    ]);

    const actions: RecommendedAction[] = [];

    if (leastCompleteAsset) {
      actions.push({
        id: `rec-asset-${leastCompleteAsset.id}`,
        badge: 'AI RECOMMENDED',
        title: `Complete ${leastCompleteAsset.name}`,
        description: 'This brand asset needs content. Use AI Exploration to fill it in quickly.',
        actionLabel: 'Open Asset',
        actionHref: 'brand-asset-detail',
        entityId: leastCompleteAsset.id,
        entityType: 'brand-asset',
        icon: 'FileText',
      });
    }

    if (personasWithoutExploration) {
      actions.push({
        id: `rec-persona-${personasWithoutExploration.id}`,
        badge: 'AI RECOMMENDED',
        title: `Run AI Exploration for ${personasWithoutExploration.name}`,
        description: 'Deepen your understanding of this persona with AI-powered analysis.',
        actionLabel: 'Start Exploration',
        actionHref: 'persona-detail',
        entityId: personasWithoutExploration.id,
        entityType: 'persona',
        icon: 'Users',
      });
    }

    if (productCount === 0) {
      actions.push({
        id: 'rec-products',
        badge: 'AI RECOMMENDED',
        title: 'Add Your Products & Services',
        description: 'Document your offerings to enable product-persona alignment and better targeting.',
        actionLabel: 'Add Product',
        actionHref: 'product-analyzer',
        icon: 'Layers',
      });
    }

    if (highRelevanceTrendCount > 0 && actions.length < 3) {
      actions.push({
        id: 'rec-trends',
        badge: 'AI RECOMMENDED',
        title: `Activate ${highRelevanceTrendCount} high-relevance trend${highRelevanceTrendCount > 1 ? 's' : ''}`,
        description: 'High-relevance trends detected that could strengthen your brand strategy.',
        actionLabel: 'View Trends',
        actionHref: 'trends',
        icon: 'TrendingUp',
      });
    }

    if (campaignsWithoutStrategy && actions.length < 3) {
      actions.push({
        id: `rec-strategy-${campaignsWithoutStrategy.id}`,
        badge: 'AI RECOMMENDED',
        title: `Generate strategy for ${campaignsWithoutStrategy.title}`,
        description: 'This campaign is missing a strategy. Generate one with AI.',
        actionLabel: 'Generate Strategy',
        actionHref: 'campaign-detail',
        entityId: campaignsWithoutStrategy.id,
        entityType: 'campaign',
        icon: 'Megaphone',
      });
    }

    if (actions.length === 0) {
      actions.push({
        id: 'rec-alignment',
        badge: 'AI RECOMMENDED',
        title: 'Run a Brand Alignment Scan',
        description: 'Check consistency across all your brand modules and identify misalignments.',
        actionLabel: 'Run Scan',
        actionHref: 'brand-alignment',
        icon: 'Target',
      });
    }

    const result = actions.slice(0, 3);
    setCache(cacheKeys.dashboard.recommended(workspaceId), result, CACHE_TTL.DASHBOARD);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[GET /api/dashboard/recommended]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
