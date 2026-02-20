import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { NOTIFICATION_LIST_SELECT } from '@/lib/db/queries';
import { setCache, cachedJson } from '@/lib/api/cache';
import { cacheKeys, CACHE_TTL } from '@/lib/api/cache-keys';

export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 });

    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Cache unfiltered default requests
    const isUnfiltered = !category && !unreadOnly && limit === 50 && offset === 0;
    if (isUnfiltered) {
      const hit = cachedJson(cacheKeys.notifications.list(workspaceId, userId));
      if (hit) return hit;
    }

    const where: Record<string, unknown> = { workspaceId, userId };
    if (category) where.category = category;
    if (unreadOnly) where.isRead = false;

    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
        select: NOTIFICATION_LIST_SELECT,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { workspaceId, userId, isRead: false } }),
    ]);

    const responseData = {
      items: items.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        description: n.description,
        category: n.category,
        isRead: n.isRead,
        actionUrl: n.actionUrl,
        actorName: n.actorName,
        createdAt: n.createdAt.toISOString(),
      })),
      total,
      unreadCount,
    };

    if (isUnfiltered) {
      setCache(cacheKeys.notifications.list(workspaceId, userId), responseData, CACHE_TTL.OVERVIEW);
    }

    return NextResponse.json(responseData, {
      headers: isUnfiltered ? { 'X-Cache': 'MISS' } : {},
    });
  } catch (error) {
    console.error('[GET /api/notifications]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
