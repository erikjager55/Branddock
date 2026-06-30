// =============================================================
// Logo Color Extractor
//
// For sites without CSS design tokens (a big share of WordPress
// theme sites, e.g. dtsede.nl) the brand's primary colour lives
// *only* inside the logo bitmap. The CSS-driven pipeline cannot
// see it, so the authoritative palette ends up dominated by
// neutrals.
//
// This module fetches the primary logo, extracts the dominant
// colours, and the pipeline feeds them into the framework-detector
// bucket with a synthetic `detectorName: 'logo-extraction'`. They
// then flow into `buildAuthoritativePalette` at confidence=high,
// which makes Claude assign a PRIMARY category by convention.
//
// Two strategies:
//   1. SVG — regex on fill/stroke attributes and inline style values.
//   2. Raster (png/jpg/webp) — sharp resize → RGBA histogram →
//      quantised RGB buckets weighted by non-transparent pixel count.
//
// A "logo" to us is just the first element of `ScrapedData.logoUrls`;
// non-URL placeholders like "[SVG logo found in HTML]" are skipped.
// =============================================================

import sharp from 'sharp';
import { safeFetch } from '@/lib/utils/ssrf';

// ─── Types ────────────────────────────────────────────

export interface LogoColor {
  /** Normalised hex (`#RRGGBB`, uppercase). */
  hex: string;
  /**
   * Share of non-transparent logo pixels belonging to this colour bucket.
   * 0..1 for raster. For SVG we use 1/n as a positional fallback since
   * there's no rendering.
   */
  dominance: number;
  source: 'raster' | 'svg';
}

// Same UA as the main scraper — using the default fetch UA triggers
// 403s on many WordPress CDNs.
const CHROME_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const FETCH_TIMEOUT_MS = 10000;
/** Downscaled resolution used for the raster histogram. 64x64 is enough to
 *  preserve dominant colours while keeping the iteration cheap. */
const RASTER_SAMPLE_SIZE = 64;
/** Quantisation step in 0..255 space. 32 → 8 buckets per channel → 512 total,
 *  which strikes a balance between "merging anti-aliasing" and "not conflating
 *  distinct brand shades like teal and aqua". */
const COLOR_QUANTIZATION = 32;
/** Alpha threshold; pixels below this are treated as transparent background. */
const ALPHA_THRESHOLD = 64;
/** Minimum dominance for a raster colour to survive. Below this it's almost
 *  certainly anti-aliasing noise or a small accent we don't want PRIMARY/SECONDARY. */
const MIN_DOMINANCE = 0.05;
/** Hard cap on colours we return. */
const MAX_LOGO_COLORS = 3;

// ─── Public API ───────────────────────────────────────

/**
 * Extract dominant colours from a logo URL. Returns `[]` on any failure
 * (unreachable, unsupported MIME, transparent-only image, etc.) so the
 * caller can safely merge without null-checks.
 */
export async function extractLogoColors(logoUrl: string): Promise<LogoColor[]> {
  if (!logoUrl) return [];
  // Skip non-fetchable placeholders emitted by findLogoUrls (e.g. '[SVG logo found in HTML]').
  if (!/^https?:\/\//i.test(logoUrl)) return [];

  // safeFetch validates the URL + every redirect hop (block private/DNS-rebind, H1).
  let response: Response;
  try {
    response = await safeFetch(logoUrl, {
      headers: { 'User-Agent': CHROME_USER_AGENT, Accept: 'image/*,*/*;q=0.8' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    return [];
  }

  if (!response.ok) return [];

  const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
  const pathLower = new URL(response.url).pathname.toLowerCase();

  // SVG — text-based, parse declaratively.
  if (contentType.includes('svg') || pathLower.endsWith('.svg')) {
    const text = await response.text();
    return extractSvgColors(text);
  }

  // Raster — pipe into sharp for histogram.
  if (
    contentType.startsWith('image/') ||
    /\.(png|jpe?g|gif|webp|bmp|avif|ico)$/.test(pathLower)
  ) {
    const buffer = Buffer.from(await response.arrayBuffer());
    return extractRasterColors(buffer);
  }

  return [];
}

// ─── SVG strategy ─────────────────────────────────────

/** Parse inline SVG text for colour declarations. */
export function extractSvgColors(svg: string): LogoColor[] {
  const colors = new Set<string>();

  // Attribute form: fill="#..." / stroke="#..." / stop-color="#..."
  const attrPattern = /(?:fill|stroke|stop-color)\s*=\s*["']([^"']+)["']/gi;
  for (const match of svg.matchAll(attrPattern)) {
    const hex = coerceColor(match[1]);
    if (hex && !isNearBlackOrWhite(hex) && !isGrayish(hex)) colors.add(hex);
  }

  // Inline CSS form: style="fill: #..." / style="stroke: #..."
  const stylePattern = /(?:fill|stroke|stop-color)\s*:\s*([^;"']+)/gi;
  for (const match of svg.matchAll(stylePattern)) {
    const hex = coerceColor(match[1]);
    if (hex && !isNearBlackOrWhite(hex) && !isGrayish(hex)) colors.add(hex);
  }

  // Dominance is unknown without rendering, so use 1/n positional fallback.
  const list = Array.from(colors).slice(0, MAX_LOGO_COLORS);
  return list.map((hex, i) => ({
    hex,
    dominance: (list.length - i) / list.length,
    source: 'svg' as const,
  }));
}

// ─── Raster strategy ──────────────────────────────────

/** Run sharp + quantise + pick dominant buckets on a raster image buffer. */
export async function extractRasterColors(buffer: Buffer): Promise<LogoColor[]> {
  let pixels: Buffer;
  try {
    const { data } = await sharp(buffer)
      .resize(RASTER_SAMPLE_SIZE, RASTER_SAMPLE_SIZE, {
        fit: 'inside',
        withoutEnlargement: false,
      })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    pixels = data;
  } catch {
    return [];
  }

  const buckets = new Map<string, number>();
  let chromaticPixels = 0;
  let opaquePixels = 0;
  // pixels is RGBA — 4 bytes per pixel
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const a = pixels[i + 3];
    if (a < ALPHA_THRESHOLD) continue;
    opaquePixels++;
    const hex = rgbToHex(r, g, b);
    if (isNearBlackOrWhite(hex) || isGrayish(hex)) continue;
    const key = quantize(r, g, b);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
    chromaticPixels++;
  }

  // If less than 10% of the logo is chromatic it's effectively grayscale
  // (monochrome marks like Vercel's triangle). Returning nothing lets the
  // CSS-variable pipeline win instead of us declaring mid-gray as PRIMARY.
  if (opaquePixels === 0) return [];
  if (chromaticPixels / opaquePixels < 0.1) return [];

  // Compute bucket averages (so quantised bucket #3E4A/7 resolves to a
  // real-ish colour rather than the quantised corner). Second pass over
  // pixels is skipped for simplicity — we return the bucket centre.
  const results: LogoColor[] = [];
  for (const [key, count] of buckets) {
    const dominance = count / opaquePixels;
    if (dominance < MIN_DOMINANCE) continue;
    results.push({
      hex: quantKeyToHex(key),
      dominance,
      source: 'raster',
    });
  }

  return results
    .sort((a, b) => b.dominance - a.dominance)
    .slice(0, MAX_LOGO_COLORS);
}

// ─── Helpers ──────────────────────────────────────────

function coerceColor(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'none' || trimmed === 'transparent' || trimmed.startsWith('url('))
    return null;
  // Hex (3, 4, 6, 8 digits — drop alpha)
  const hexMatch = trimmed.match(/^#([0-9a-f]{3,8})\b/i);
  if (hexMatch) {
    const c = hexMatch[1];
    if (c.length === 3) {
      return `#${c[0]}${c[0]}${c[1]}${c[1]}${c[2]}${c[2]}`.toUpperCase();
    }
    if (c.length === 4) {
      return `#${c[0]}${c[0]}${c[1]}${c[1]}${c[2]}${c[2]}`.toUpperCase();
    }
    if (c.length === 6) return `#${c}`.toUpperCase();
    if (c.length === 8) return `#${c.slice(0, 6)}`.toUpperCase();
  }
  // rgb(r, g, b) / rgba(...) — accept both legacy comma and modern space syntax.
  const rgbMatch = trimmed.match(/^rgba?\(\s*(\d{1,3})\s*[\s,]\s*(\d{1,3})\s*[\s,]\s*(\d{1,3})/i);
  if (rgbMatch) {
    const r = Number(rgbMatch[1]);
    const g = Number(rgbMatch[2]);
    const b = Number(rgbMatch[3]);
    if (r <= 255 && g <= 255 && b <= 255) return rgbToHex(r, g, b);
  }
  return null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

function quantize(r: number, g: number, b: number): string {
  const qr = Math.round(r / COLOR_QUANTIZATION) * COLOR_QUANTIZATION;
  const qg = Math.round(g / COLOR_QUANTIZATION) * COLOR_QUANTIZATION;
  const qb = Math.round(b / COLOR_QUANTIZATION) * COLOR_QUANTIZATION;
  return `${Math.min(qr, 255)}:${Math.min(qg, 255)}:${Math.min(qb, 255)}`;
}

function quantKeyToHex(key: string): string {
  const [r, g, b] = key.split(':').map(Number);
  return rgbToHex(r, g, b);
}

/**
 * Drop pure-black / pure-white buckets. Uses the same tight thresholds as
 * url-scraper.isNearBlackOrWhite so dark brand navy and cream backgrounds
 * are preserved.
 */
function isNearBlackOrWhite(hex: string): boolean {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return false;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const avg = (r + g + b) / 3;
  return avg < 15 || avg > 245;
}

/**
 * Drop near-monochrome (gray) colours. Monochrome logos (Vercel's triangle,
 * many agency marks) would otherwise inject mid-gray as "primary" — a
 * high-confidence false positive that Claude then binds to. Threshold 35
 * in 0..255 max-min space treats anything that close to grayscale as
 * not-a-brand-colour. The CSS-variable / frequency pipeline still exposes
 * any real brand colour that lives outside the logo.
 */
const MIN_COLOR_SATURATION_DIFF = 35;

function isGrayish(hex: string): boolean {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return false;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return Math.max(r, g, b) - Math.min(r, g, b) < MIN_COLOR_SATURATION_DIFF;
}
