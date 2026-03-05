// =============================================================
// Cloudflare R2 Storage (Fase 2.2)
//
// S3-compatible cloud storage for file uploads:
//  - Persona avatar images (AI-generated)
//  - Knowledge resource files (PDFs, images, etc.)
//  - Brandstyle assets (logos)
//
// Env vars required:
//  - R2_ACCOUNT_ID
//  - R2_ACCESS_KEY_ID
//  - R2_SECRET_ACCESS_KEY
//  - R2_BUCKET_NAME
//  - R2_PUBLIC_URL (public bucket URL for serving files)
//
// Falls back gracefully if env vars are not set.
// =============================================================

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';

// ─── Types ─────────────────────────────────────────────────

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  contentType: string;
}

export interface StorageConfig {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
}

// ─── Client (lazy init) ────────────────────────────────────

let client: S3Client | null = null;
let config: StorageConfig | null = null;

function getConfig(): StorageConfig | null {
  if (config) return config;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !publicUrl) {
    return null;
  }

  config = { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl };
  return config;
}

function getClient(): S3Client | null {
  if (client) return client;

  const cfg = getConfig();
  if (!cfg) return null;

  client = new S3Client({
    region: 'auto',
    endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });

  return client;
}

/**
 * Check whether cloud storage is configured.
 */
export function isStorageConfigured(): boolean {
  return getConfig() !== null;
}

// ─── Upload ────────────────────────────────────────────────

/**
 * Upload a file to R2.
 *
 * @param key          - Object key (path in bucket), e.g. "personas/abc123/avatar.png"
 * @param body         - File contents as Buffer or Uint8Array
 * @param contentType  - MIME type, e.g. "image/png"
 * @returns            - { key, url, size, contentType }
 * @throws             - If storage is not configured or upload fails
 */
export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<UploadResult> {
  const s3 = getClient();
  const cfg = getConfig();

  if (!s3 || !cfg) {
    throw new Error('Cloud storage is not configured. Set R2_* environment variables.');
  }

  await s3.send(new PutObjectCommand({
    Bucket: cfg.bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }));

  const url = `${cfg.publicUrl.replace(/\/$/, '')}/${key}`;

  return { key, url, size: body.length, contentType };
}

/**
 * Upload a base64-encoded file to R2.
 * Convenient for Gemini image generation output.
 */
export async function uploadBase64(
  key: string,
  base64Data: string,
  contentType: string,
): Promise<UploadResult> {
  const buffer = Buffer.from(base64Data, 'base64');
  return uploadFile(key, buffer, contentType);
}

/**
 * Upload a Web API File object to R2.
 * Convenient for form-data file uploads.
 */
export async function uploadWebFile(
  key: string,
  file: File,
): Promise<UploadResult> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return uploadFile(key, buffer, file.type);
}

// ─── Delete ────────────────────────────────────────────────

/**
 * Delete a file from R2.
 */
export async function deleteFile(key: string): Promise<void> {
  const s3 = getClient();
  const cfg = getConfig();

  if (!s3 || !cfg) return;

  await s3.send(new DeleteObjectCommand({
    Bucket: cfg.bucketName,
    Key: key,
  }));
}

// ─── Exists ────────────────────────────────────────────────

/**
 * Check if a file exists in R2.
 */
export async function fileExists(key: string): Promise<boolean> {
  const s3 = getClient();
  const cfg = getConfig();

  if (!s3 || !cfg) return false;

  try {
    await s3.send(new HeadObjectCommand({
      Bucket: cfg.bucketName,
      Key: key,
    }));
    return true;
  } catch {
    return false;
  }
}

// ─── URL helpers ───────────────────────────────────────────

/**
 * Get the public URL for a storage key.
 */
export function getPublicUrl(key: string): string | null {
  const cfg = getConfig();
  if (!cfg) return null;
  return `${cfg.publicUrl.replace(/\/$/, '')}/${key}`;
}

/**
 * Generate a unique key for a file within a namespace.
 *
 * @param namespace - e.g. "personas", "knowledge-resources"
 * @param entityId  - e.g. persona ID or resource ID
 * @param filename  - original filename or generated name
 */
export function generateKey(namespace: string, entityId: string, filename: string): string {
  const timestamp = Date.now();
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();
  return `${namespace}/${entityId}/${timestamp}-${sanitized}`;
}
