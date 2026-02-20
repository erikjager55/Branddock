import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { z } from 'zod';

type RouteParams = { params: Promise<{ deliverableId: string }> };

const insertInsightSchema = z.object({
  insightId: z.string().min(1),
  format: z.enum(['INLINE', 'QUOTE', 'DATA_VIZ', 'AI_ADAPTED']),
  location: z.enum(['cursor', 'ai']),
});

// POST /api/studio/[deliverableId]/insights/insert — Insert insight into content
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
      select: { id: true },
    });

    if (!deliverable) {
      return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = insertInsightSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { insightId, format, location } = parsed.data;

    // Fetch the insight to get title and source
    const insight = await prisma.marketInsight.findUnique({
      where: { id: insightId },
      select: { title: true, source: true },
    });

    if (!insight) {
      return NextResponse.json({ error: 'Insight not found' }, { status: 404 });
    }

    // Create InsertedInsight record
    const inserted = await prisma.insertedInsight.create({
      data: {
        insightTitle: insight.title,
        insightSource: insight.source,
        insertFormat: format,
        insertLocation: location,
        deliverableId,
      },
    });

    return NextResponse.json({
      id: inserted.id,
      insightTitle: inserted.insightTitle,
      format: inserted.insertFormat,
      location: inserted.insertLocation,
    });
  } catch (error) {
    console.error('POST /api/studio/[deliverableId]/insights/insert error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
