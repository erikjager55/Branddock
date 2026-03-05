import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// ─── POST /api/items/[itemType]/[itemId]/knowledge-sources/upload ──
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
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 });
    }

    // Save file to uploads directory
    const uploadDir = path.join(process.cwd(), 'uploads', 'knowledge-sources', workspaceId);
    await mkdir(uploadDir, { recursive: true });

    const ext = path.extname(file.name);
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const filePath = path.join(uploadDir, safeName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Extract text content for simple text files
    let content: string | null = null;
    const textTypes = ['text/plain', 'text/markdown', 'text/csv'];
    if (textTypes.includes(file.type)) {
      content = buffer.toString('utf-8');
    }

    const source = await prisma.itemKnowledgeSource.create({
      data: {
        itemType,
        itemId,
        title: title.trim(),
        sourceType: 'file',
        description: description?.trim() || null,
        content,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        filePath: `uploads/knowledge-sources/${workspaceId}/${safeName}`,
        isProcessed: content !== null,
        workspaceId,
      },
    });

    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/items/.../knowledge-sources/upload]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
