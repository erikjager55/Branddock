// =============================================================
// Logo overlay compositor
//
// Composites a brand-logo asset onto an AI-generated image in
// one of four corners. Used after `generateFalImage` when the
// scene prompt mentioned the brand logo — image models can't
// render logos reliably, so we strip the mention pre-gen and
// composite the real asset post-gen.
//
// Output: PNG buffer. Caller uploads to the existing media-asset
// storage and the URL replaces the raw image URL on the
// DeliverableComponent record.
// =============================================================

import sharp from 'sharp';
import { readFile } from 'fs/promises';
import path from 'path';
import type { LogoPosition } from './logo-intent';

interface CompositeArgs {
  /** The AI-generated base image (https URL — fetched server-side). Genegeerd
   *  wanneer `imageBuffer` is meegegeven (W5 hero-pad: bytes al in geheugen,
   *  voorkomt een tweede fetch op een verlopende fal-URL). */
  imageUrl?: string;
  /** Pre-fetched base-image bytes — wint van imageUrl wanneer aanwezig. */
  imageBuffer?: Buffer;
  /** The brand-logo asset URL (PNG / SVG with alpha). */
  logoUrl: string;
  /** "svg" | "png" | "jpg" — drives rasterisation strategy. */
  logoFileType: string;
  position: LogoPosition;
  /** Logo width as a fraction of base-image width. Default 0.12 (12 %)
   *  — matches the LinkedIn paid-video convention for end-frame logo
   *  size. Caller can shrink/grow per scene if needed. */
  widthFraction?: number;
  /** Padding from the chosen corner, in fractions of image width.
   *  Default 0.04 (4 %) → ~50 px on a 1280-wide image. */
  paddingFraction?: number;
}

/**
 * Composite the logo onto the base image. Returns a PNG buffer.
 * Throws on fetch / decode failure — caller wraps in try/catch
 * and falls back to the raw image so generation never silently
 * fails because of an overlay bug.
 */
export async function compositeLogoOverlay({
  imageUrl,
  imageBuffer,
  logoUrl,
  logoFileType,
  position,
  widthFraction = 0.12,
  paddingFraction = 0.04,
}: CompositeArgs): Promise<Buffer> {
  // ── Fetch both assets ─────────────────────────────────────
  // Base uit het meegegeven buffer (hero-pad) of anders alsnog fetchen (scene).
  if (!imageBuffer && !imageUrl) {
    throw new Error('compositeLogoOverlay requires imageBuffer or imageUrl');
  }
  const [baseBuf, logoBuf] = await Promise.all([
    imageBuffer ? Promise.resolve(imageBuffer) : fetchAsBuffer(imageUrl!, 'base image'),
    fetchAsBuffer(logoUrl, 'logo asset'),
  ]);

  // ── Inspect base dimensions to size the logo proportionally ─
  const baseSharp = sharp(baseBuf);
  const baseMeta = await baseSharp.metadata();
  const baseWidth = baseMeta.width;
  const baseHeight = baseMeta.height;
  if (!baseWidth || !baseHeight) {
    throw new Error('Base image has no dimensions — cannot composite overlay');
  }

  // ── Rasterise the logo at the target width ────────────────
  // Sharp handles SVG, PNG, JPEG natively. We resize by width and let
  // height scale to preserve aspect. `withoutEnlargement: true` would
  // skip the resize when the source is already small; for our case we
  // explicitly WANT the scale so we leave it off.
  const targetLogoWidth = Math.max(32, Math.round(baseWidth * widthFraction));
  const logoSharp = sharp(logoBuf, {
    // SVG: bump density so the rasterised output stays crisp at the
    // target width. Default density (72) gives blurry SVG → PNG.
    density: logoFileType === 'svg' ? 300 : undefined,
  }).resize({ width: targetLogoWidth, withoutEnlargement: false });

  const logoPngBuf = await logoSharp.png().toBuffer();
  const logoMeta = await sharp(logoPngBuf).metadata();
  const logoWidth = logoMeta.width ?? targetLogoWidth;
  const logoHeight = logoMeta.height ?? Math.round(targetLogoWidth * 0.4);

  // ── Resolve corner placement ──────────────────────────────
  const pad = Math.max(16, Math.round(baseWidth * paddingFraction));
  const positions: Record<LogoPosition, { top: number; left: number }> = {
    'top-left': { top: pad, left: pad },
    'top-right': { top: pad, left: Math.max(0, baseWidth - logoWidth - pad) },
    'bottom-left': { top: Math.max(0, baseHeight - logoHeight - pad), left: pad },
    'bottom-right': {
      top: Math.max(0, baseHeight - logoHeight - pad),
      left: Math.max(0, baseWidth - logoWidth - pad),
    },
  };
  const { top, left } = positions[position];

  // ── Composite ─────────────────────────────────────────────
  return baseSharp
    .composite([{ input: logoPngBuf, top, left }])
    .png()
    .toBuffer();
}

/** Grens (0-255 gemiddelde luminantie) waaronder een hoek als "donker" geldt. */
export const DARK_CORNER_LUMINANCE_THRESHOLD = 128;

/**
 * W5 L-Fase 3 — sample de gemiddelde luminantie (0-255, Rec. 601) van de
 * overlay-hoek zodat de caller een LIGHT/DARK-logovariant kan kiezen. Sampelt
 * een vierkant ter grootte van `fraction` × de kortste zijde in de gevraagde
 * hoek. Gooit niet voor een degraderend caller-pad: bij een decode-fout valt
 * 'm terug op het midden-grijs (128) → polariteit-neutraal.
 */
export async function sampleCornerLuminance(
  imageBuffer: Buffer,
  position: LogoPosition,
  fraction: number = 0.22,
): Promise<number> {
  try {
    const img = sharp(imageBuffer);
    const meta = await img.metadata();
    const w = meta.width;
    const h = meta.height;
    if (!w || !h) return 128;
    const size = Math.max(8, Math.round(Math.min(w, h) * fraction));
    const sw = Math.min(size, w);
    const sh = Math.min(size, h);
    const left = position === "top-right" || position === "bottom-right" ? Math.max(0, w - sw) : 0;
    const top = position === "bottom-left" || position === "bottom-right" ? Math.max(0, h - sh) : 0;
    // Resize het hoek-uitsnede naar 1×1 → de pixelwaarde IS het gemiddelde.
    const { data } = await img
      .extract({ left, top, width: sw, height: sh })
      .resize(1, 1, { fit: "fill" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const r = data[0] ?? 128;
    const g = data[1] ?? 128;
    const b = data[2] ?? 128;
    return 0.299 * r + 0.587 * g + 0.114 * b;
  } catch {
    return 128;
  }
}

async function fetchAsBuffer(url: string, label: string): Promise<Buffer> {
  // Local-storage assets are persisted under public/uploads/... and served
  // by Next.js as relative URLs ("/uploads/media/…"). Server-side fetch()
  // can't resolve those without a base host, so we read straight from disk
  // — matches the path-resolution used by LocalStorageProvider.delete.
  if (url.startsWith('/')) {
    // Zie fetch-media-buffer: relatief pad = local-dev; in prod fail-closed.
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Failed to fetch ${label}: relatief pad "${url}" in productie (R2 niet geconfigureerd?)`);
    }
    const filePath = path.join('public', url.replace(/^\//, ''));
    return readFile(filePath);
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${label} (${res.status}): ${url}`);
  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}
