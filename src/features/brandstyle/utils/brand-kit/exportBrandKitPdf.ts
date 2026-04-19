// =============================================================
// Brand Kit PDF Exporter (single-file, Claude Design compatible)
//
// Fetches brand data + logo images, embeds logos into the
// composite PDF, and triggers a one-click PDF download.
//
// Unlike the ZIP variant, this produces a single PDF that can
// be uploaded directly as a "Document" input during Claude
// Design's onboarding flow.
// =============================================================

import {
  buildCompositeBrandPdf,
  type EmbeddedLogo,
} from "./buildCompositeBrandPdf";
import type { BrandKitData } from "./types";

export type BrandKitPdfStage =
  | "fetching"
  | "fetching-logos"
  | "building-pdf"
  | "complete";

export interface BrandKitPdfProgress {
  stage: BrandKitPdfStage;
  message: string;
  current?: number;
  total?: number;
}

// ─── Helpers ─────────────────────────────────────────────────

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "brand"
  );
}

function triggerDownload(bytes: Uint8Array, filename: string): void {
  // Copy into a fresh ArrayBuffer to satisfy Blob's BlobPart type and
  // avoid SharedArrayBuffer edge cases.
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const blob = new Blob([buffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Load an Image element from a blob URL and await its decode.
 */
async function loadImageElement(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  return new Promise<HTMLImageElement>((resolve, reject) => {
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image decode failed"));
    img.src = src;
  });
}

/**
 * Rasterise an SVG (or any image source) to a PNG data URL via canvas.
 * SVG needs intrinsic width/height or a viewBox; if missing we fall
 * back to 800×600 to keep the logo embeddable.
 */
async function imageToPngDataUrl(
  blob: Blob,
): Promise<{ dataUrl: string; aspectRatio: number }> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImageElement(url);
    const width = img.naturalWidth || 800;
    const height = img.naturalHeight || 600;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.drawImage(img, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/png");
    return { dataUrl, aspectRatio: width / Math.max(height, 1) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Fetch a logo via the server proxy and normalise it to a jsPDF-
 * compatible data URL. SVGs are rasterised to PNG; PNG/JPEG pass
 * through directly.
 */
async function loadLogo(
  url: string,
  name: string,
  type: string,
): Promise<EmbeddedLogo | null> {
  try {
    const proxied = `/api/export/proxy-image?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxied);
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "image/png";
    const blob = await response.blob();

    // SVG → rasterise
    if (contentType.includes("svg")) {
      const { dataUrl, aspectRatio } = await imageToPngDataUrl(blob);
      return { name, type, format: "PNG", dataUrl, aspectRatio };
    }

    // JPEG/PNG/WebP → canvas for aspect ratio + normalised format
    const { dataUrl, aspectRatio } = await imageToPngDataUrl(blob);
    const format: "PNG" | "JPEG" = contentType.includes("jpeg") ? "JPEG" : "PNG";
    // For JPEG we want to preserve the JPEG encoding; canvas re-encodes to PNG
    // by default. For simplicity treat everything as PNG — jsPDF decodes both.
    return { name, type, format, dataUrl, aspectRatio };
  } catch {
    return null;
  }
}

// ─── Main orchestrator ───────────────────────────────────────

export async function exportBrandKitPdf(
  onProgress?: (progress: BrandKitPdfProgress) => void,
): Promise<void> {
  const report = (
    stage: BrandKitPdfStage,
    message: string,
    extra?: Partial<BrandKitPdfProgress>,
  ) => {
    onProgress?.({ stage, message, ...extra });
  };

  // 1. Fetch aggregated data
  report("fetching", "Fetching brand data…");
  const dataRes = await fetch("/api/export/brand-kit/data");
  if (!dataRes.ok) {
    const err = await dataRes.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? `Data fetch failed (${dataRes.status})`);
  }
  const data: BrandKitData = await dataRes.json();

  // 2. Fetch logos in parallel
  const styleguideLogos = data.styleguide?.logos ?? [];
  let logos: EmbeddedLogo[] = [];
  if (styleguideLogos.length > 0) {
    report(
      "fetching-logos",
      `Fetching ${styleguideLogos.length} logo${styleguideLogos.length === 1 ? "" : "s"}…`,
      { current: 0, total: styleguideLogos.length },
    );
    const results = await Promise.all(
      styleguideLogos.map((v) =>
        loadLogo(
          v.fileUrl,
          v.description ?? v.fileName,
          v.variant.toLowerCase(),
        ),
      ),
    );
    logos = results.filter((l): l is EmbeddedLogo => l !== null);
  }

  // 3. Build PDF (synchronous, all images already decoded)
  report("building-pdf", "Building brand book…");
  const pdfBytes = buildCompositeBrandPdf(data, logos);

  // 4. Download
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `${slugify(data.workspace.slug || data.workspace.name)}-brand-book-${timestamp}.pdf`;
  triggerDownload(pdfBytes, filename);

  report("complete", "Brand book exported");
}
