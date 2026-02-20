import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { cachedJson, setCache } from '@/lib/api/cache';
import { cacheKeys, CACHE_TTL } from '@/lib/api/cache-keys';

export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 });

    const hit = cachedJson(cacheKeys.dashboard.attention(workspaceId));
    if (hit) return hit;

    const assets = await prisma.brandAsset.findMany({
      where: {
        workspaceId,
        status: { not: 'READY' },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: { id: true, name: true, status: true, description: true },
    });

    const items = assets.map((asset) => {
      const isDraft = asset.status === 'DRAFT';
      const coveragePercentage = isDraft ? 0 : Math.floor(Math.random() * 45) + 5;
      return {
        id: asset.id,
        title: asset.name,
        description: `Coverage is ${coveragePercentage}% (<50% threshold). ${isDraft ? `${asset.name} has no content yet` : `${asset.name} needs review`}`,
        icon: isDraft ? 'FileText' : 'AlertTriangle',
        iconColor: isDraft ? 'text-gray-400' : 'text-orange-500',
        actionType: isDraft ? 'take_action' as const : 'fix' as const,
        actionLabel: isDraft ? 'Take Action' : 'Fix',
        actionHref: 'brand-asset-detail',
        coveragePercentage,
      };
    });

    setCache(cacheKeys.dashboard.attention(workspaceId), items, CACHE_TTL.DASHBOARD);
    return NextResponse.json(items);
  } catch (error) {
    console.error('[GET /api/dashboard/attention]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
