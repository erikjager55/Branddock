import { NextRequest, NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { getAvailableContextItems } from '@/lib/ai/context/fetcher';

// Groups that are already auto-injected into canvas context stack
const EXCLUDED_GROUPS = ['brand_asset', 'brandstyle'];

// ─── GET /api/workspaces/[workspaceId]/context-items ─────────
// Returns available knowledge context items for the selector modal.
// Excludes groups already auto-injected (brand_asset, brandstyle).
// ──────────────────────────────────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const sessionWorkspaceId = await resolveWorkspaceId();
    if (!sessionWorkspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId } = await params;
    if (workspaceId !== sessionWorkspaceId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const allGroups = await getAvailableContextItems(workspaceId);
    const groups = allGroups.filter((g) => !EXCLUDED_GROUPS.includes(g.key));

    return NextResponse.json({ groups });
  } catch (error) {
    console.error('[GET /api/workspaces/:id/context-items]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
