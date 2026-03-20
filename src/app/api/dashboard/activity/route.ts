import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { cachedJson, setCache } from '@/lib/api/cache';
import { cacheKeys, CACHE_TTL } from '@/lib/api/cache-keys';

export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 });

    const hit = cachedJson(cacheKeys.dashboard.activity(workspaceId));
    if (hit) return hit;

    const [brandAssets, personas, campaigns, competitors] = await Promise.all([
      prisma.brandAsset.findMany({
        where: { workspaceId },
        orderBy: { updatedAt: 'desc' },
        take: 3,
        select: { id: true, name: true, updatedAt: true },
      }),
      prisma.persona.findMany({
        where: { workspaceId },
        orderBy: { updatedAt: 'desc' },
        take: 3,
        select: { id: true, name: true, updatedAt: true },
      }),
      prisma.campaign.findMany({
        where: { workspaceId },
        orderBy: { updatedAt: 'desc' },
        take: 3,
        select: { id: true, title: true, updatedAt: true },
      }),
      prisma.competitor.findMany({
        where: { workspaceId },
        orderBy: { updatedAt: 'desc' },
        take: 3,
        select: { id: true, name: true, updatedAt: true },
      }),
    ]);

    const items = [
      ...brandAssets.map((a) => ({ id: a.id, title: a.name, type: 'brand-asset' as const, updatedAt: a.updatedAt.toISOString() })),
      ...personas.map((p) => ({ id: p.id, title: p.name, type: 'persona' as const, updatedAt: p.updatedAt.toISOString() })),
      ...campaigns.map((c) => ({ id: c.id, title: c.title, type: 'campaign' as const, updatedAt: c.updatedAt.toISOString() })),
      ...competitors.map((c) => ({ id: c.id, title: c.name, type: 'competitor' as const, updatedAt: c.updatedAt.toISOString() })),
    ];

    items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    const result = items.slice(0, 5);

    setCache(cacheKeys.dashboard.activity(workspaceId), result, CACHE_TTL.DASHBOARD);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[GET /api/dashboard/activity]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
