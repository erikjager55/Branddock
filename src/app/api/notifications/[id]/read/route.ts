import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 });

    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    invalidateCache(cacheKeys.prefixes.notifications(workspaceId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PATCH /api/notifications/:id/read]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
