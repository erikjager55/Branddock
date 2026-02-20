import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';

export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 });

    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const count = await prisma.notification.count({
      where: { workspaceId, userId: session.user.id, isRead: false },
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error('[GET /api/notifications/count]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
