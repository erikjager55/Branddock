import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { z } from 'zod';

type RouteParams = { params: Promise<{ deliverableId: string }> };

const exportSchema = z.object({
  format: z.string().min(1),
});

// POST /api/studio/[deliverableId]/export — Export content (stub)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    const { deliverableId } = await params;

    // Verify deliverable belongs to workspace
    const deliverable = await prisma.deliverable.findFirst({
      where: {
        id: deliverableId,
        campaign: { workspaceId: workspaceId ?? undefined },
      },
      select: { id: true, title: true },
    });

    if (!deliverable) {
      return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = exportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // Stub: return fake download URL and expiration
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    return NextResponse.json({
      downloadUrl: `https://cdn.branddock.com/exports/${deliverableId}/${deliverable.title}.${parsed.data.format}`,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('POST /api/studio/[deliverableId]/export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
