import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';

// PUT /api/admin/exploration-configs/[id]/knowledge/[itemId] — update item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 });

    const { id, itemId } = await params;

    // Verify config belongs to workspace
    const config = await prisma.explorationConfig.findFirst({
      where: { id, workspaceId },
    });
    if (!config) return NextResponse.json({ error: 'Config not found' }, { status: 404 });

    // Verify item belongs to config
    const existing = await prisma.explorationKnowledgeItem.findFirst({
      where: { id: itemId, configId: id },
    });
    if (!existing) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

    const { title, content, category } = await request.json();

    const item = await prisma.explorationKnowledgeItem.update({
      where: { id: itemId },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(category !== undefined && { category: category || null }),
      },
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error('[PUT /api/admin/exploration-configs/:id/knowledge/:itemId]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/exploration-configs/[id]/knowledge/[itemId] — delete item
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 });

    const { id, itemId } = await params;

    // Verify config belongs to workspace
    const config = await prisma.explorationConfig.findFirst({
      where: { id, workspaceId },
    });
    if (!config) return NextResponse.json({ error: 'Config not found' }, { status: 404 });

    // Verify item belongs to config
    const existing = await prisma.explorationKnowledgeItem.findFirst({
      where: { id: itemId, configId: id },
    });
    if (!existing) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

    await prisma.explorationKnowledgeItem.delete({ where: { id: itemId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/admin/exploration-configs/:id/knowledge/:itemId]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
