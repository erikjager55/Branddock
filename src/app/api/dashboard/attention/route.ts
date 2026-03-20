import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { cachedJson, setCache } from '@/lib/api/cache';
import { cacheKeys, CACHE_TTL } from '@/lib/api/cache-keys';
import type { AttentionItem } from '@/types/dashboard';

export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 });

    const hit = cachedJson(cacheKeys.dashboard.attention(workspaceId));
    if (hit) return hit;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const [
      draftAssets,
      staleCompetitors,
      highRelevanceTrends,
      urgentCampaigns,
      campaignsWithoutDeliverables,
      lastScan,
    ] = await Promise.all([
      // Brand assets not READY → priority 4
      prisma.brandAsset.findMany({
        where: { workspaceId, status: { not: 'READY' } },
        orderBy: { updatedAt: 'desc' },
        take: 3,
        select: { id: true, name: true, status: true },
      }),
      // Stale competitors (updatedAt > 30 days) → priority 2
      prisma.competitor.findMany({
        where: { workspaceId, updatedAt: { lt: thirtyDaysAgo } },
        orderBy: { updatedAt: 'asc' },
        take: 2,
        select: { id: true, name: true, updatedAt: true },
      }),
      // High-relevance trends not activated → priority 3
      prisma.detectedTrend.findMany({
        where: { workspaceId, relevanceScore: { gte: 80 }, isActivated: false, isDismissed: false },
        orderBy: { relevanceScore: 'desc' },
        take: 2,
        select: { id: true, title: true, relevanceScore: true },
      }),
      // Campaigns with deadline < 7 days → priority 1
      prisma.campaign.findMany({
        where: { workspaceId, status: 'ACTIVE', endDate: { lte: sevenDaysFromNow, gte: now } },
        orderBy: { endDate: 'asc' },
        take: 2,
        select: { id: true, title: true, endDate: true },
      }),
      // Campaigns without deliverables → priority 4
      prisma.campaign.findMany({
        where: { workspaceId, status: 'ACTIVE', deliverables: { none: {} } },
        take: 2,
        select: { id: true, title: true },
      }),
      // Last trend scan → priority 3
      prisma.trendResearchJob.findFirst({
        where: { workspaceId },
        orderBy: { startedAt: 'desc' },
        select: { startedAt: true },
      }),
    ]);

    const items: AttentionItem[] = [];

    // Urgent campaigns (priority 1)
    for (const c of urgentCampaigns) {
      items.push({
        id: `campaign-deadline-${c.id}`,
        entityId: c.id,
        entityType: 'campaign',
        priority: 1,
        title: c.title,
        description: `Campaign deadline approaching`,
        icon: 'Clock',
        iconColor: 'text-red-500',
        actionType: 'fix',
        actionLabel: 'Review',
        actionHref: 'campaign-detail',
      });
    }

    // Stale competitors (priority 2)
    for (const comp of staleCompetitors) {
      items.push({
        id: `competitor-stale-${comp.id}`,
        entityId: comp.id,
        entityType: 'competitor',
        priority: 2,
        title: comp.name,
        description: 'Competitor data is outdated (30+ days)',
        icon: 'RefreshCw',
        iconColor: 'text-orange-500',
        actionType: 'take_action',
        actionLabel: 'Refresh',
        actionHref: 'competitor-detail',
      });
    }

    // High-relevance trends (priority 3)
    for (const trend of highRelevanceTrends) {
      items.push({
        id: `trend-activate-${trend.id}`,
        entityId: trend.id,
        entityType: 'trend',
        priority: 3,
        title: trend.title,
        description: `High relevance trend (${trend.relevanceScore}%) not activated`,
        icon: 'TrendingUp',
        iconColor: 'text-teal-500',
        actionType: 'take_action',
        actionLabel: 'Activate',
        actionHref: 'trend-detail',
      });
    }

    // Last trend scan > 3 days ago (priority 3)
    if (!lastScan || lastScan.startedAt < threeDaysAgo) {
      items.push({
        id: 'trend-scan-stale',
        entityId: '',
        entityType: 'trend',
        priority: 3,
        title: 'Trend Radar Scan Overdue',
        description: 'Last scan was more than 3 days ago',
        icon: 'Target',
        iconColor: 'text-purple-500',
        actionType: 'take_action',
        actionLabel: 'Scan Now',
        actionHref: 'trends',
      });
    }

    // Brand assets not ready (priority 4)
    for (const asset of draftAssets) {
      const isDraft = asset.status === 'DRAFT';
      items.push({
        id: `asset-${asset.id}`,
        entityId: asset.id,
        entityType: 'brand-asset',
        priority: 4,
        title: asset.name,
        description: isDraft ? `${asset.name} has no content yet` : `${asset.name} needs review`,
        icon: isDraft ? 'FileText' : 'AlertTriangle',
        iconColor: isDraft ? 'text-gray-400' : 'text-orange-500',
        actionType: isDraft ? 'take_action' : 'fix',
        actionLabel: isDraft ? 'Take Action' : 'Fix',
        actionHref: 'brand-asset-detail',
      });
    }

    // Campaigns without deliverables (priority 4)
    for (const c of campaignsWithoutDeliverables) {
      items.push({
        id: `campaign-no-deliverables-${c.id}`,
        entityId: c.id,
        entityType: 'campaign',
        priority: 4,
        title: c.title,
        description: 'Campaign has no deliverables',
        icon: 'Megaphone',
        iconColor: 'text-orange-400',
        actionType: 'take_action',
        actionLabel: 'Add Content',
        actionHref: 'campaign-detail',
      });
    }

    // Sort by priority, take max 5
    items.sort((a, b) => a.priority - b.priority);
    const result = items.slice(0, 5);

    setCache(cacheKeys.dashboard.attention(workspaceId), result, CACHE_TTL.DASHBOARD);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[GET /api/dashboard/attention]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
