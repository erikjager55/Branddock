import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import type { StorageProvider, UploadOptions, UploadResult } from './storage-provider';
import { generateThumbnail, getImageMetadata } from './thumbnail-generator';

const UPLOAD_DIR = 'public/uploads/media';

function buildPath(workspaceId: string, fileName: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return path.join(UPLOAD_DIR, workspaceId, String(year), month, fileName);
}

function filePathToUrl(filePath: string): string {
  return '/' + filePath.replace(/^public\//, '');
}

function isImageType(contentType: string): boolean {
  return contentType.startsWith('image/') && !contentType.includes('svg');
}

export class LocalStorageProvider implements StorageProvider {
  async upload(buffer: Buffer, options: UploadOptions): Promise<UploadResult> {
    const { workspaceId, fileName, contentType, generateThumbnail: genThumb } = options;

    const ext = path.extname(fileName);
    const base = path.basename(fileName, ext);
    const uniqueName = `${base}-${Date.now()}${ext}`;
    const filePath = buildPath(workspaceId, uniqueName);

    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);

    const result: UploadResult = {
      url: filePathToUrl(filePath),
      fileSize: buffer.length,
    };

    if (isImageType(contentType)) {
      const meta = await getImageMetadata(buffer);
      if (meta) {
        result.width = meta.width;
        result.height = meta.height;
      }

      if (genThumb !== false) {
        const thumbBuffer = await generateThumbnail(buffer);
        const thumbName = `${base}-${Date.now()}-thumb.jpg`;
        const thumbPath = buildPath(workspaceId, thumbName);
        await mkdir(path.dirname(thumbPath), { recursive: true });
        await writeFile(thumbPath, thumbBuffer);
        result.thumbnailUrl = filePathToUrl(thumbPath);
      }
    }

    return result;
  }

  async delete(url: string): Promise<void> {
    const filePath = path.join('public', url.replace(/^\//, ''));
    try {
      await unlink(filePath);
    } catch {
      // File may already be deleted
    }
  }

  getUrl(key: string): string {
    return '/' + key.replace(/^public\//, '');
  }
}
