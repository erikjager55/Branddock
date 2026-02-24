import { NextRequest, NextResponse } from 'next/server';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';
import { restoreVersion } from '@/lib/versioning';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 });
    const session = await getServerSession();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    // Verify version belongs to workspace
    const existing = await prisma.resourceVersion.findFirst({ where: { id, workspaceId } });
    if (!existing) return NextResponse.json({ error: 'Version not found' }, { status: 404 });

    const newVersion = await restoreVersion(id, session.user.id);
    return NextResponse.json({ version: newVersion });
  } catch (error) {
    console.error('[POST /api/versions/:id/restore]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
