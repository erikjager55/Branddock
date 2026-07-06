// =============================================================
// GET /api/studio/[deliverableId]/seo-progress
//
// Polling-endpoint voor de queued SEO-generatie (A3-deel-2). De Canvas-client
// switcht hierheen na een `seo_queued`-event uit de orchestrate-stream en polt
// de 8-stap-voortgang van het meest recente SeoGenerationJob-record.
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const { deliverableId } = await params;
    const job = await prisma.seoGenerationJob.findFirst({
      where: { deliverableId, workspaceId },
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        status: true,
        currentStep: true,
        totalSteps: true,
        stepLabel: true,
        errors: true,
        completedAt: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'No SEO job found' }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error('[GET /api/studio/[deliverableId]/seo-progress]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
