// =============================================================
// Style Analyzer — orchestrates the full illustration style analysis pipeline
// =============================================================

import { readFile } from "fs/promises";
import path from "path";
import { extractColorsFromImage, mergeColorPalettes } from "./color-extractor";
import { extractImageStats, mergeImageStats } from "./image-stats-extractor";
import { analyzeWithClaudeVision } from "./claude-vision-analyzer";
import { isR2Configured, getR2SignedUrl } from "@/lib/storage/r2-storage";
import type {
  IllustrationStyleProfile,
  ExtractedColorPalette,
  ImageStats,
} from "./style-profile.types";

// ─── Image download helper (supports local files + R2) ─────

async function downloadImageBuffer(storageKey: string): Promise<Buffer> {
  // Local storage: storageKey is a path like /uploads/media/...
  if (storageKey.startsWith("/uploads/") || storageKey.startsWith("uploads/")) {
    const localPath = path.join(process.cwd(), "public", storageKey.replace(/^\//, ""));
    return readFile(localPath);
  }

  // R2 storage
  if (!isR2Configured()) {
    throw new Error(`Cannot download image: R2 not configured and path is not local: ${storageKey}`);
  }

  const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
  const accountId = process.env.R2_ACCOUNT_ID!;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID!;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!;
  const bucketName = process.env.R2_BUCKET_NAME || "branddock-media";

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  const response = await client.send(
    new GetObjectCommand({ Bucket: bucketName, Key: storageKey }),
  );

  if (!response.Body) {
    throw new Error(`Empty response for R2 key: ${storageKey}`);
  }

  const chunks: Uint8Array[] = [];
  const stream = response.Body as AsyncIterable<Uint8Array>;
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// ─── Types ─────────────────────────────────────────────────

interface ReferenceImageData {
  storageKey: string;
  storageUrl: string;
}

// ─── Main analysis function ────────────────────────────────

/**
 * Analyze the illustration style from reference images.
 *
 * Pipeline:
 * 1. Download all images from R2
 * 2. Extract colors (node-vibrant) and stats (sharp) per image
 * 3. Send images + programmatic data to Claude Vision
 * 4. Merge Claude output with programmatic data
 * 5. Generate style + negative prompts
 *
 * @param images - Reference images with R2 storage keys and URLs
 * @returns Complete IllustrationStyleProfile
 */
export async function analyzeIllustrationStyle(
  images: ReferenceImageData[],
): Promise<IllustrationStyleProfile> {
  if (images.length === 0) {
    throw new Error("At least 1 reference image is required for style analysis");
  }

  // Limit to 10 images (Claude Vision context)
  const selectedImages = images.slice(0, 10);

  console.log(`[style-analyzer] Starting analysis of ${selectedImages.length} images`);

  // Step 1+2: Download images and extract features in parallel
  const perImageResults = await Promise.all(
    selectedImages.map(async (img, i) => {
      console.log(`[style-analyzer] Downloading image ${i + 1}/${selectedImages.length}: ${img.storageKey}`);
      const buffer = await withTimeout(
        downloadImageBuffer(img.storageKey),
        30_000,
        `Timeout downloading image: ${img.storageKey}`,
      );
      console.log(`[style-analyzer] Image ${i + 1} downloaded (${buffer.length} bytes), extracting features...`);
      const [colors, stats] = await Promise.all([
        withTimeout(extractColorsFromImage(buffer), 15_000, `Timeout extracting colors from image ${i + 1}`),
        withTimeout(extractImageStats(buffer), 15_000, `Timeout extracting stats from image ${i + 1}`),
      ]);
      console.log(`[style-analyzer] Image ${i + 1} features extracted`);
      return { colors, stats, storageKey: img.storageKey };
    }),
  );

  const colorPalettes: ExtractedColorPalette[] = perImageResults.map((r) => r.colors);
  const statsArray: ImageStats[] = perImageResults.map((r) => r.stats);

  // Step 2b: Compute consensus across all images
  const mergedPalette = mergeColorPalettes(colorPalettes);
  const avgStats = mergeImageStats(statsArray);

  // Step 3: Build image sources for Claude Vision
  const isLocal = selectedImages[0]?.storageKey.startsWith("/uploads/") ||
    selectedImages[0]?.storageKey.startsWith("uploads/");

  let imageUrls: string[] | undefined;
  let imageBuffers: { buffer: Buffer; mediaType: string }[] | undefined;

  if (isLocal) {
    // Local storage: send images as base64 (Claude can't access localhost URLs)
    console.log(`[style-analyzer] Using base64 encoding for ${perImageResults.length} local images...`);
    imageBuffers = await Promise.all(
      selectedImages.map(async (img) => {
        const localPath = path.join(process.cwd(), "public", img.storageKey.replace(/^\//, ""));
        const buffer = await readFile(localPath);
        const ext = path.extname(img.storageKey).toLowerCase();
        const mediaType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
        return { buffer, mediaType };
      }),
    );
  } else if (process.env.R2_PUBLIC_URL) {
    console.log(`[style-analyzer] Using R2 public URLs...`);
    imageUrls = selectedImages.map((img) => `${process.env.R2_PUBLIC_URL}/${img.storageKey}`);
  } else {
    console.log(`[style-analyzer] Using R2 signed URLs...`);
    imageUrls = await Promise.all(
      selectedImages.map((img) => getR2SignedUrl(img.storageKey, 300)),
    );
  }

  console.log(`[style-analyzer] Image sources ready, calling Claude Vision...`);

  // Step 4: Claude Vision analysis with programmatic grounding
  const profile = await analyzeWithClaudeVision({
    imageUrls,
    imageBuffers,
    colorPalettes,
    mergedPalette,
    statsPerImage: statsArray,
    avgStats: {
      avgEntropy: avgStats.avgEntropy,
      avgBrightness: avgStats.avgBrightness,
      avgContrast: avgStats.avgContrast,
    },
  });

  console.log(`[style-analyzer] Analysis complete — style: ${profile.classification.primaryStyle}`);
  return profile;
}

/** Run a promise with a timeout */
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}
