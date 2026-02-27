import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';

// GET /api/admin/exploration-configs/[id]/knowledge — list knowledge items
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 });

    const { id } = await params;

    // Verify config belongs to workspace
    const config = await prisma.explorationConfig.findFirst({
      where: { id, workspaceId },
    });
    if (!config) return NextResponse.json({ error: 'Config not found' }, { status: 404 });

    const items = await prisma.explorationKnowledgeItem.findMany({
      where: { configId: id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error('[GET /api/admin/exploration-configs/:id/knowledge]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/exploration-configs/[id]/knowledge — create knowledge item
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 });

    const { id } = await params;

    // Verify config belongs to workspace
    const config = await prisma.explorationConfig.findFirst({
      where: { id, workspaceId },
    });
    if (!config) return NextResponse.json({ error: 'Config not found' }, { status: 404 });

    const { title, content, category } = await request.json();

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const item = await prisma.explorationKnowledgeItem.create({
      data: { configId: id, title, content, category: category || null },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/admin/exploration-configs/:id/knowledge]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
