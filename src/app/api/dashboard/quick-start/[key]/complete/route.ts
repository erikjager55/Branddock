import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';

type RouteParams = { params: Promise<{ key: string }> };

interface QuickStartItem {
  key: string;
  label: string;
  completed: boolean;
  href: string;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 });

    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;

    const { key } = await params;

    const pref = await prisma.dashboardPreference.findUnique({ where: { userId } });
    if (!pref) return NextResponse.json({ error: 'Preferences not found' }, { status: 404 });

    const items = (pref.quickStartItems as unknown as QuickStartItem[]) ?? [];
    const updated = items.map((item) =>
      item.key === key ? { ...item, completed: true } : item
    );

    await prisma.dashboardPreference.update({
      where: { userId },
      data: { quickStartItems: updated as unknown as Prisma.InputJsonValue },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[POST /api/dashboard/quick-start/:key/complete]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
