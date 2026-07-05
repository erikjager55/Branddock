import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { validateBinaryFile } from '@/lib/security/file-validator';
import { getStorageProvider } from '@/lib/storage';
import path from 'path';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Knowledge sources: docs + text + images.
const TEXT_EXTS: ReadonlySet<string> = new Set(['.txt', '.md', '.csv', '.json']);
const BINARY_ALLOWED_MIMES: ReadonlySet<string> = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);

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

    const ext = path.extname(file.name).toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());

    // Text formats have no magic bytes — allowlist by extension.
    // Binary formats must pass magic-byte validation.
    const isText = TEXT_EXTS.has(ext);
    if (!isText) {
      const contentCheck = await validateBinaryFile(buffer, BINARY_ALLOWED_MIMES);
      if (!contentCheck.ok) {
        return NextResponse.json(
          { error: contentCheck.error ?? 'Unsupported or invalid file type' },
          { status: 400 },
        );
      }
    }

    // Serverless-safe: via de storage-provider i.p.v. direct naar disk.
    const { url: fileUrl } = await getStorageProvider().upload(buffer, {
      workspaceId,
      fileName: file.name,
      contentType: file.type,
      generateThumbnail: false,
    });

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
        filePath: fileUrl,
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
