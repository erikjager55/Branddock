import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  content: z.string().max(50000).optional(),
  url: z.string().url().optional(),
});

// ─── PUT /api/items/[itemType]/[itemId]/knowledge-sources/[sourceId] ──
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ itemType: string; itemId: string; sourceId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const { sourceId } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const existing = await prisma.itemKnowledgeSource.findFirst({
      where: { id: sourceId, workspaceId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    const source = await prisma.itemKnowledgeSource.update({
      where: { id: sourceId },
      data: parsed.data,
    });

    return NextResponse.json({ source });
  } catch (error) {
    console.error('[PUT /api/items/.../knowledge-sources/...]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── DELETE /api/items/[itemType]/[itemId]/knowledge-sources/[sourceId] ──
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ itemType: string; itemId: string; sourceId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const { sourceId } = await params;

    const existing = await prisma.itemKnowledgeSource.findFirst({
      where: { id: sourceId, workspaceId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    await prisma.itemKnowledgeSource.delete({
      where: { id: sourceId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/items/.../knowledge-sources/...]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
