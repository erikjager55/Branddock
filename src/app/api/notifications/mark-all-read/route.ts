import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

export async function POST() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 });

    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const result = await prisma.notification.updateMany({
      where: { workspaceId, userId: session.user.id, isRead: false },
      data: { isRead: true },
    });

    invalidateCache(cacheKeys.prefixes.notifications(workspaceId));

    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    console.error('[POST /api/notifications/mark-all-read]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
