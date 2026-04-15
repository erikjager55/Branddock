import { NextRequest } from 'next/server';
import { getServerSession } from '@/lib/auth-server';
import { parsePdf } from '@/lib/brandstyle/pdf-parser';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * POST /api/claw/upload — Parse uploaded file and return extracted text.
 * Supports PDF (via unpdf) and plain text files (TXT, MD).
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return Response.json({ error: 'No file provided' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return Response.json({ error: 'File too large (max 10MB)' }, { status: 400 });
  }

  const fileName = file.name.toLowerCase();

  try {
    let extractedText: string;

    if (fileName.endsWith('.pdf')) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const parsed = await parsePdf(buffer, file.name);
      extractedText = parsed.text;
    } else if (fileName.endsWith('.txt') || fileName.endsWith('.md') || fileName.endsWith('.csv')) {
      extractedText = await file.text();
    } else {
      // Try reading as text for unknown types
      try {
        extractedText = await file.text();
      } catch {
        return Response.json({ error: 'Unsupported file type' }, { status: 400 });
      }
    }

    // Truncate very long files
    const maxChars = 30000;
    const truncated = extractedText.length > maxChars;
    const content = truncated
      ? extractedText.slice(0, maxChars) + '\n\n[Content truncated — original was ' + extractedText.length + ' characters]'
      : extractedText;

    return Response.json({
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      content,
      truncated,
    });
  } catch (err) {
    console.error('Claw file parse error:', err);
    return Response.json({ error: 'Failed to parse file' }, { status: 500 });
  }
}
