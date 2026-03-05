import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { z } from 'zod';

const createSchema = z.object({
  title: z.string().min(1).max(200),
  sourceType: z.enum(['text', 'url']),
  description: z.string().max(500).optional(),
  content: z.string().max(50000).optional(),
  url: z.string().url().optional(),
});

// ─── GET /api/items/[itemType]/[itemId]/knowledge-sources ──
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ itemType: string; itemId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const { itemType, itemId } = await params;

    const sources = await prisma.itemKnowledgeSource.findMany({
      where: { workspaceId, itemType, itemId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ sources });
  } catch (error) {
    console.error('[GET /api/items/.../knowledge-sources]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST /api/items/[itemType]/[itemId]/knowledge-sources ──
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ itemType: string; itemId: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
    }

    const { itemType, itemId } = await params;
    const body = await request.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { title, sourceType, description, content, url } = parsed.data;

    const source = await prisma.itemKnowledgeSource.create({
      data: {
        itemType,
        itemId,
        title,
        sourceType,
        description: description ?? null,
        content: sourceType === 'text' ? (content ?? null) : null,
        url: sourceType === 'url' ? (url ?? null) : null,
        isProcessed: sourceType === 'text',
        workspaceId,
      },
    });

    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/items/.../knowledge-sources]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
