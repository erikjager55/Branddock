import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

export async function DELETE() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 });

    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const result = await prisma.notification.deleteMany({
      where: { workspaceId, userId: session.user.id },
    });

    invalidateCache(cacheKeys.prefixes.notifications(workspaceId));

    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    console.error('[DELETE /api/notifications/clear]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
