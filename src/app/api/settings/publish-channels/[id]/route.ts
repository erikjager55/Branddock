import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ---------------------------------------------------------------------------
// GET /api/settings/publish-channels/[id] — Get channel detail (with credentials)
// ---------------------------------------------------------------------------
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const channel = await prisma.publishChannel.findFirst({
      where: { id, workspaceId },
    });
    if (!channel) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ channel });
  } catch (error) {
    console.error('[GET /api/settings/publish-channels/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/settings/publish-channels/[id] — Update channel
// ---------------------------------------------------------------------------
const updateSchema = z.object({
  label: z.string().max(200).optional(),
  isActive: z.boolean().optional(),
  credentials: z.record(z.string(), z.unknown()).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const existing = await prisma.publishChannel.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.label !== undefined) data.label = parsed.data.label;
    if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;
    if (parsed.data.credentials !== undefined) data.credentials = parsed.data.credentials as object;
    if (parsed.data.settings !== undefined) data.settings = parsed.data.settings as object;

    const updated = await prisma.publishChannel.update({
      where: { id },
      data,
      select: {
        id: true,
        platform: true,
        provider: true,
        label: true,
        isActive: true,
        lastPublishedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ channel: updated });
  } catch (error) {
    console.error('[PATCH /api/settings/publish-channels/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/settings/publish-channels/[id] — Disconnect channel
// ---------------------------------------------------------------------------
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const existing = await prisma.publishChannel.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.publishChannel.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[DELETE /api/settings/publish-channels/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
