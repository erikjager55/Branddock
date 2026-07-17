import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { parseJsonBody } from '@/lib/api/parse-json-body';
import { requireDeveloper } from '@/lib/developer-access';

// L8 Zod-sweep (audit 2026-06-26, batch 7): title/content/category gingen
// ongetypeerd in prisma.create (presence-checks only).
const createKnowledgeItemSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(1).max(100_000),
  category: z.string().max(200).nullish(),
});

// GET /api/admin/exploration-configs/[id]/knowledge — list knowledge items
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await requireDeveloper())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

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
    if (!(await requireDeveloper())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 });

    const { id } = await params;

    // Verify config belongs to workspace
    const config = await prisma.explorationConfig.findFirst({
      where: { id, workspaceId },
    });
    if (!config) return NextResponse.json({ error: 'Config not found' }, { status: 404 });

    const parsed = await parseJsonBody(request, createKnowledgeItemSchema);
    if (!parsed.ok) return parsed.response;
    const { title, content, category } = parsed.data;

    const item = await prisma.explorationKnowledgeItem.create({
      data: { configId: id, title, content, category: category || null },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/admin/exploration-configs/:id/knowledge]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
