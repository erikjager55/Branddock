import { NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import {
  resolveWorkspaceBrandContext,
  toBrandContextResponse,
} from '@/lib/consistent-models/workspace-context-resolver';

/** GET /api/media/ai-images/brand-context — Workspace-level brand tags for the AI Studio generator. */
export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = await resolveWorkspaceBrandContext(workspaceId);
    return NextResponse.json(toBrandContextResponse(ctx));
  } catch (error) {
    console.error('Error resolving workspace brand context:', error);
    return NextResponse.json(
      { error: 'Failed to resolve brand context.' },
      { status: 500 },
    );
  }
}
