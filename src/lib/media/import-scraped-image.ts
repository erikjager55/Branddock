// =============================================================
// Import Scraped Image to Media Library
//
// Helper used by the brandstyle analyzer to route images that are
// scraped from a target website into the Media Library instead of
// storing them on the BrandStyleguide record itself.
//
// - Fetches the image with SSRF protection
// - Uploads it via the configured storage provider
// - Creates a MediaAsset record with source=SCRAPED and matching
//   MediaCategory derived from the scraper's context label
// - Tags the asset with "scraped" + the context for filtering
// =============================================================

import { prisma } from "@/lib/prisma";
import { getStorageProvider } from "@/lib/storage";
import { assertSafeUrl } from "@/lib/utils/ssrf";
import {
  generateMediaSlug,
  detectMediaType,
} from "@/features/media-library/utils/media-utils";
import type { MediaCategory, Prisma } from "@prisma/client";

export type ScrapedContext = "hero" | "lifestyle" | "product" | "team" | "general";

export interface ImportScrapedImageOptions {
  url: string;
  alt?: string | null;
  context: ScrapedContext;
  workspaceId: string;
  uploadedById: string;
  sourceUrl?: string | null;
}

const CONTEXT_TO_CATEGORY: Record<ScrapedContext, MediaCategory> = {
  hero: "HERO_IMAGE",
  lifestyle: "LIFESTYLE",
  product: "PRODUCT_PHOTO",
  team: "TEAM_PHOTO",
  general: "OTHER",
};

const MAX_BYTES = 20 * 1024 * 1024; // 20MB cap per scraped image
const FETCH_TIMEOUT_MS = 15_000;

function extractFileName(url: string): string {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    if (last) return last;
  } catch {
    // ignore
  }
  return "scraped-image";
}

function deriveNameFromAlt(alt: string | null | undefined, fallback: string): string {
  const trimmed = alt?.trim();
  if (trimmed) return trimmed.slice(0, 120);
  return fallback.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
}

async function fetchImageBuffer(url: string): Promise<{
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}> {
  assertSafeUrl(url);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`Fetch failed with status ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const mimeType = contentType.split(";")[0].trim();
    if (!mimeType.startsWith("image/")) {
      throw new Error(`Unexpected content-type: ${mimeType}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      throw new Error("Empty response body");
    }
    if (arrayBuffer.byteLength > MAX_BYTES) {
      throw new Error(`Image exceeds ${MAX_BYTES} bytes`);
    }

    return {
      buffer: Buffer.from(arrayBuffer),
      mimeType,
      fileName: extractFileName(url),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function ensureUniqueSlug(
  workspaceId: string,
  baseSlug: string,
): Promise<string> {
  let slug = baseSlug || `scraped-${Date.now()}`;
  const existing = await prisma.mediaAsset.findUnique({
    where: { workspaceId_slug: { workspaceId, slug } },
  });
  if (!existing) return slug;
  slug = `${slug}-${Date.now().toString(36)}`;
  return slug;
}

/**
 * Import a single scraped image into the Media Library.
 * Returns the created MediaAsset id, or null on any failure
 * (logged and swallowed so one bad image doesn't break the batch).
 */
export async function importScrapedImageToMediaLibrary(
  opts: ImportScrapedImageOptions,
): Promise<string | null> {
  const { url, alt, context, workspaceId, uploadedById, sourceUrl } = opts;

  try {
    const { buffer, mimeType, fileName } = await fetchImageBuffer(url);

    const storage = getStorageProvider();
    const uploadResult = await storage.upload(buffer, {
      workspaceId,
      fileName,
      contentType: mimeType,
      generateThumbnail: true,
    });

    const mediaType = detectMediaType(mimeType);
    const assetName = deriveNameFromAlt(alt, fileName);
    const baseSlug = generateMediaSlug(assetName);
    const slug = await ensureUniqueSlug(workspaceId, baseSlug);

    const asset = await prisma.mediaAsset.create({
      data: {
        name: assetName,
        slug,
        fileUrl: uploadResult.url,
        fileType: mimeType,
        fileSize: uploadResult.fileSize,
        fileName,
        width: uploadResult.width || null,
        height: uploadResult.height || null,
        mediaType,
        category: CONTEXT_TO_CATEGORY[context],
        source: "SCRAPED",
        sourceUrl: sourceUrl ?? url,
        thumbnailUrl: uploadResult.thumbnailUrl || null,
        aiTags: ["scraped", context],
        workspaceId,
        uploadedById,
      } satisfies Prisma.MediaAssetUncheckedCreateInput,
    });

    return asset.id;
  } catch (err) {
    console.warn(
      `[import-scraped-image] Failed for ${url}:`,
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}

/**
 * Import many scraped images sequentially. Sequential (not parallel)
 * so we don't hammer the source server or overrun the storage provider.
 */
export async function importScrapedImagesToMediaLibrary(
  images: Array<{ url: string; alt: string | null; context: ScrapedContext }>,
  meta: { workspaceId: string; uploadedById: string; sourceUrl?: string | null },
): Promise<{ imported: number; failed: number }> {
  let imported = 0;
  let failed = 0;

  for (const image of images) {
    const id = await importScrapedImageToMediaLibrary({
      url: image.url,
      alt: image.alt,
      context: image.context,
      workspaceId: meta.workspaceId,
      uploadedById: meta.uploadedById,
      sourceUrl: meta.sourceUrl ?? null,
    });
    if (id) imported++;
    else failed++;
  }

  return { imported, failed };
}
