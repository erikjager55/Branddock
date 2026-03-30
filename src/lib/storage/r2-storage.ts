import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { StorageProvider, UploadOptions, UploadResult } from './storage-provider';
import { generateThumbnail, getImageMetadata } from './thumbnail-generator';
import { randomUUID } from 'crypto';
import path from 'path';

const SIGNED_URL_EXPIRY = 3600; // 1 hour

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME || 'branddock-media';
  const publicUrl = process.env.R2_PUBLIC_URL; // Optional CDN endpoint

  return { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl };
}

export function isR2Configured(): boolean {
  const { accountId, accessKeyId, secretAccessKey } = getR2Config();
  return Boolean(accountId && accessKeyId && secretAccessKey);
}

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (_client) return _client;

  const { accountId, accessKeyId, secretAccessKey } = getR2Config();
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.');
  }

  _client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  return _client;
}

function getBucket(): string {
  return getR2Config().bucketName;
}

/** Upload a buffer to R2 with a specific key */
export async function uploadToR2(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<{ key: string; url: string }> {
  const client = getClient();

  await client.send(new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));

  const { publicUrl } = getR2Config();
  const url = publicUrl
    ? `${publicUrl}/${key}`
    : await getR2SignedUrl(key);

  return { key, url };
}

/** Get a signed URL for a key */
export async function getR2SignedUrl(key: string, expiresIn = SIGNED_URL_EXPIRY): Promise<string> {
  const client = getClient();

  return getSignedUrl(client, new GetObjectCommand({
    Bucket: getBucket(),
    Key: key,
  }), { expiresIn });
}

/** Delete a single object from R2 */
export async function deleteFromR2(key: string): Promise<void> {
  const client = getClient();

  await client.send(new DeleteObjectCommand({
    Bucket: getBucket(),
    Key: key,
  }));
}

/** Delete all objects with a given prefix (e.g. an entire model's folder) */
export async function deleteR2Prefix(prefix: string): Promise<void> {
  const client = getClient();
  const bucket = getBucket();

  let continuationToken: string | undefined;

  do {
    const listResult = await client.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    }));

    if (listResult.Contents) {
      await Promise.all(
        listResult.Contents.map(obj =>
          obj.Key ? client.send(new DeleteObjectCommand({ Bucket: bucket, Key: obj.Key })) : Promise.resolve()
        )
      );
    }

    continuationToken = listResult.NextContinuationToken;
  } while (continuationToken);
}

/** Build an R2 storage key for consistent model reference images */
export function buildModelStorageKey(
  workspaceId: string,
  modelId: string,
  fileName: string,
  isThumb = false
): string {
  const ext = path.extname(fileName) || '.jpg';
  const uuid = randomUUID();
  const folder = isThumb ? 'thumbs' : 'refs';
  return `ws_${workspaceId}/models/${modelId}/${folder}/${uuid}${ext}`;
}

/** Build an R2 storage key for generated images */
export function buildGenerationStorageKey(
  workspaceId: string,
  modelId: string
): string {
  const uuid = randomUUID();
  return `ws_${workspaceId}/models/${modelId}/generations/${uuid}.png`;
}

/**
 * R2StorageProvider — implements StorageProvider interface for Cloudflare R2.
 * Falls back to signed URLs when no public CDN URL is configured.
 */
export class R2StorageProvider implements StorageProvider {
  async upload(buffer: Buffer, options: UploadOptions): Promise<UploadResult> {
    const { workspaceId, fileName, contentType, generateThumbnail: genThumb } = options;

    const ext = path.extname(fileName);
    const uuid = randomUUID();
    const key = `ws_${workspaceId}/media/${uuid}${ext}`;

    const { url } = await uploadToR2(key, buffer, contentType);

    const result: UploadResult = {
      url,
      fileSize: buffer.length,
    };

    if (contentType.startsWith('image/') && !contentType.includes('svg')) {
      const meta = await getImageMetadata(buffer);
      if (meta) {
        result.width = meta.width;
        result.height = meta.height;
      }

      if (genThumb !== false) {
        const thumbBuffer = await generateThumbnail(buffer);
        const thumbKey = `ws_${workspaceId}/media/thumbs/${uuid}.jpg`;
        const thumbResult = await uploadToR2(thumbKey, thumbBuffer, 'image/jpeg');
        result.thumbnailUrl = thumbResult.url;
      }
    }

    return result;
  }

  async delete(url: string): Promise<void> {
    // Extract key from URL
    const { publicUrl } = getR2Config();
    let key: string;
    if (publicUrl && url.startsWith(publicUrl)) {
      key = url.slice(publicUrl.length + 1);
    } else {
      // Signed URL — extract key from path
      try {
        const parsed = new URL(url);
        key = parsed.pathname.slice(1); // Remove leading /
      } catch {
        return;
      }
    }

    await deleteFromR2(key);
  }

  getUrl(key: string): string {
    const { publicUrl } = getR2Config();
    if (publicUrl) return `${publicUrl}/${key}`;
    // For signed URLs, this is synchronous so we can't generate one here.
    // Callers should use getR2SignedUrl() directly when they need fresh signed URLs.
    return key;
  }
}
