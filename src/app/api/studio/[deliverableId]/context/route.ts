import { NextRequest, NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { assembleCanvasContext } from '@/lib/ai/canvas-context';

// ---------------------------------------------------------------------------
// GET /api/studio/[deliverableId]/context
// Returns the 5-layer context stack for the canvas without triggering generation.
// ---------------------------------------------------------------------------
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

    // Verify deliverable ownership
    const deliverable = await prisma.deliverable.findUnique({
      where: { id: deliverableId },
      include: {
        campaign: {
          select: { workspaceId: true },
        },
      },
    });

    if (!deliverable) {
      return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
    }

    if (!deliverable.campaign || deliverable.campaign.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const contextStack = await assembleCanvasContext(deliverableId, workspaceId);

    // ─── Inheritance candidate detection ─────────────────────────
    // When the user opens a fresh deliverable (NOT_STARTED, no generated
    // content, no previous inheritance) AND there's a prior completed
    // deliverable of the same type in the same campaign, offer its
    // settings as a one-time inheritance. This skips Canvas Step 1
    // (Context) and Step 3 (Medium) for the power-user repeat workflow.
    let inheritanceCandidate: {
      id: string;
      title: string;
      settings: unknown;
    } | null = null;

    const currentSettings = (deliverable.settings as Record<string, unknown>) ?? {};
    const alreadyInherited = !!currentSettings.inheritedFrom;
    const hasGeneratedContent =
      !!deliverable.generatedText ||
      !!deliverable.generatedVideoUrl ||
      (Array.isArray(deliverable.generatedImageUrls) && deliverable.generatedImageUrls.length > 0);

    if (deliverable.status === 'NOT_STARTED' && !hasGeneratedContent && !alreadyInherited) {
      const previous = await prisma.deliverable.findFirst({
        where: {
          campaignId: deliverable.campaignId,
          contentType: deliverable.contentType,
          status: 'COMPLETED',
          id: { not: deliverable.id },
        },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, title: true, settings: true },
      });
      if (previous) {
        inheritanceCandidate = {
          id: previous.id,
          title: previous.title,
          settings: previous.settings,
        };
      }
    }

    return NextResponse.json({ contextStack, inheritanceCandidate });
  } catch (error) {
    console.error('[GET /api/studio/[deliverableId]/context]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
