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
import type { LogoPosition } from './logo-intent';

interface CompositeArgs {
  /** The AI-generated base image (https URL — fetched server-side). */
  imageUrl: string;
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
  logoUrl,
  logoFileType,
  position,
  widthFraction = 0.12,
  paddingFraction = 0.04,
}: CompositeArgs): Promise<Buffer> {
  // ── Fetch both assets ─────────────────────────────────────
  const [baseBuf, logoBuf] = await Promise.all([
    fetchAsBuffer(imageUrl, 'base image'),
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

async function fetchAsBuffer(url: string, label: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${label} (${res.status}): ${url}`);
  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}
