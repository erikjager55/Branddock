import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 });
    const { id } = await params;

    const version = await prisma.resourceVersion.findFirst({
      where: { id, workspaceId },
      include: { createdBy: { select: { id: true, name: true } } },
    });

    if (!version) return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    return NextResponse.json({ version });
  } catch (error) {
    console.error('[GET /api/versions/:id]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 });
    const { id } = await params;
    const body = await request.json();

    const version = await prisma.resourceVersion.updateMany({
      where: { id, workspaceId },
      data: {
        label: body.label,
        changeNote: body.changeNote,
      },
    });

    return NextResponse.json({ updated: version.count });
  } catch (error) {
    console.error('[PATCH /api/versions/:id]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
