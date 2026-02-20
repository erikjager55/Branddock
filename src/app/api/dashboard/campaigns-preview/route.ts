import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';

export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 });

    const campaigns = await prisma.campaign.findMany({
      where: { workspaceId, status: 'ACTIVE' },
      orderBy: { updatedAt: 'desc' },
      take: 3,
      include: {
        _count: { select: { deliverables: true } },
        deliverables: { select: { status: true } },
      },
    });

    const items = campaigns.map((c) => {
      const total = c.deliverables.length;
      const completed = c.deliverables.filter((d) => d.status === 'COMPLETED').length;
      return {
        id: c.id,
        title: c.title,
        type: (c.type === 'STRATEGIC' ? 'Strategic' : 'Quick') as 'Strategic' | 'Quick',
        status: c.status,
        deliverableProgress: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('[GET /api/dashboard/campaigns-preview]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
