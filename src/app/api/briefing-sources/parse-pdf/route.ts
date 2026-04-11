// =============================================================================
// POST /api/briefing-sources/parse-pdf
//
// Accepts a PDF file upload and extracts its text content for use as
// briefing source material. Returns the parsed text + filename + title.
//
// We don't keep the PDF file itself — only the extracted text lives in the
// wizard state. If the user wants to re-process they re-upload. This avoids
// file storage infrastructure for what's essentially a one-shot context
// injection.
//
// Body: multipart/form-data with `file` (max 20MB)
// Response: { fileName, title, extractedText }
// =============================================================================

import { NextResponse } from 'next/server';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { parsePdf } from '@/lib/brandstyle/pdf-parser';

export const maxDuration = 60;

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const MAX_EXTRACTED_CHARS = 12_000;

export async function POST(request: Request) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 20MB limit' },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let parsed;
    try {
      parsed = await parsePdf(buffer, file.name);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse PDF';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // Collapse whitespace and cap length
    const cleanText = parsed.text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
    const extractedText =
      cleanText.length > MAX_EXTRACTED_CHARS
        ? cleanText.slice(0, MAX_EXTRACTED_CHARS) + '\n\n[…truncated]'
        : cleanText;

    return NextResponse.json({
      fileName: file.name,
      title: parsed.metadata?.title ?? null,
      extractedText,
    });
  } catch (error) {
    console.error('[POST /api/briefing-sources/parse-pdf]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
