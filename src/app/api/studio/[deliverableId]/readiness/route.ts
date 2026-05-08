import { NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { getContentReadiness } from '@/lib/learning-loop/content-readiness';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ deliverableId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { deliverableId } = await params;
    const readiness = await getContentReadiness(deliverableId, workspaceId);
    return NextResponse.json(readiness);
  } catch (error) {
    console.error('[GET /api/studio/[deliverableId]/readiness]', error);
    // Helper throws on missing-deliverable or cross-workspace access — both
    // surface as 404 to avoid leaking existence cross-workspace.
    if (error instanceof Error && error.message.includes('not found in workspace')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to load readiness' }, { status: 500 });
  }
}
