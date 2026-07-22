import { getR2SignedUrl, isR2Configured } from './r2-storage';

/**
 * Resolve a stored storage-URL to a form that is reachable *right now*.
 *
 * Older rows (Style Studio reference images, generations) persisted the URL that
 * the storage provider returned at upload time. Before R2_PUBLIC_URL existed on
 * prod that was a *signed* R2 endpoint URL — which expires after an hour. Those
 * rows then break twice: `<img src>` previews 403 in the UI, and fal.ai cannot
 * download them as multi-ref `image_urls`, so generation silently ignores the
 * reference style (sibling of the toR2Key fix in style-analyzer, #225).
 *
 * Contract:
 * - local dev paths (`/uploads/...`) pass through untouched
 * - R2 endpoint/signed URLs (`<account>.r2.cloudflarestorage.com/<bucket>/<key>`)
 *   are rewritten to `R2_PUBLIC_URL/<key>`, or re-signed fresh when no public
 *   CDN URL is configured
 * - bare keys are resolved the same way
 * - any other http(s) URL (public CDN form, external hosts) passes through
 * - fail-soft: on any error the original value is returned
 */
export async function resolveStorageUrl(stored: string): Promise<string> {
  if (!stored) return stored;
  if (stored.startsWith('/uploads/') || stored.startsWith('uploads/')) return stored;

  const publicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, '');
  let key: string;

  if (/^https?:\/\//i.test(stored)) {
    try {
      const url = new URL(stored);
      if (!url.hostname.endsWith('.r2.cloudflarestorage.com')) {
        // Public-CDN form or foreign host — not ours to rewrite.
        return stored;
      }
      // Two endpoint forms exist in stored data: path-style
      // (<account>.r2…/<bucket>/<key>) and virtual-host style
      // (<bucket>.<account>.r2…/<key>). Only strip the first path segment
      // when it actually is the bucket name — our keys start with ws_… so
      // a false match cannot occur.
      const bucketName = process.env.R2_BUCKET_NAME || 'branddock-media';
      const segments = decodeURIComponent(url.pathname.replace(/^\//, '')).split('/');
      key = (segments[0] === bucketName ? segments.slice(1) : segments).join('/');
    } catch {
      return stored;
    }
  } else {
    key = stored;
  }

  if (!key) return stored;
  if (publicUrl) return `${publicUrl}/${key}`;
  if (!isR2Configured()) return stored;

  try {
    return await getR2SignedUrl(key);
  } catch {
    return stored;
  }
}

/** Batch variant of {@link resolveStorageUrl}; preserves order. */
export async function resolveStorageUrls(stored: string[]): Promise<string[]> {
  return Promise.all(stored.map(resolveStorageUrl));
}

/**
 * Resolve the `storageUrl` (+ optional `thumbnailUrl`) fields on a row before
 * returning it to the client — the shared shape of ReferenceImage and
 * ConsistentModelGeneration rows.
 */
export async function resolveImageRowUrls<
  T extends { storageUrl: string; thumbnailUrl?: string | null },
>(row: T): Promise<T> {
  return {
    ...row,
    storageUrl: await resolveStorageUrl(row.storageUrl),
    thumbnailUrl: row.thumbnailUrl ? await resolveStorageUrl(row.thumbnailUrl) : row.thumbnailUrl,
  };
}
