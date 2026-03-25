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

    return NextResponse.json({ contextStack });
  } catch (error) {
    console.error('[GET /api/studio/[deliverableId]/context]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
