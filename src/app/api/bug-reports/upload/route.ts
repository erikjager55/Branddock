import { NextRequest } from 'next/server';
import { getServerSession, resolveWorkspaceId } from '@/lib/auth-server';
import { getStorageProvider } from '@/lib/storage';
import { validateBinaryFile } from '@/lib/security/file-validator';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES: ReadonlySet<string> = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);

/** POST /api/bug-reports/upload — upload a screenshot image */
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) return Response.json({ error: 'No workspace' }, { status: 400 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return Response.json({ error: 'No file provided' }, { status: 400 });

  if (!ALLOWED_TYPES.has(file.type)) {
    return Response.json({ error: 'Only PNG, JPEG, WebP and GIF are allowed' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return Response.json({ error: 'File too large (max 10 MB)' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Magic-byte MIME validation — blocks client-header spoofing that would
  // otherwise let a crafted HTML/PDF through as an "image" upload.
  const contentCheck = await validateBinaryFile(buffer, ALLOWED_TYPES);
  if (!contentCheck.ok) {
    return Response.json(
      { error: contentCheck.error ?? 'Invalid file content' },
      { status: 400 },
    );
  }

  const ext = file.name.split('.').pop() ?? 'png';
  const fileName = `bug-screenshots/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  const storage = getStorageProvider();
  const result = await storage.upload(buffer, {
    workspaceId,
    fileName,
    contentType: file.type,
  });

  return Response.json({ url: result.url }, { status: 201 });
}
