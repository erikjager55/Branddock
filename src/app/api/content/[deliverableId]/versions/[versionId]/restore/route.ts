import { NextResponse } from 'next/server';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { restoreContentVersion } from '@/lib/learning-loop/content-version';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ deliverableId: string; versionId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await getServerSession();
    const userId = session?.user.id ?? null;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { deliverableId, versionId } = await params;

    const newVersion = await restoreContentVersion(versionId, workspaceId, userId);

    invalidateCache(cacheKeys.prefixes.contentVersions(deliverableId));
    invalidateCache(cacheKeys.prefixes.studio(workspaceId));
    invalidateCache(cacheKeys.prefixes.campaigns(workspaceId));

    return NextResponse.json(newVersion);
  } catch (error) {
    console.error('[POST .../versions/[versionId]/restore]', error);
    return NextResponse.json({ error: 'Failed to restore version' }, { status: 500 });
  }
}
